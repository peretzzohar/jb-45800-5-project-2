import axios from "axios";

export type Coin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
};

type ApiCoin = {
  id: string;
  name: string;
  symbol: string;
  image?: string;
  current_price?: number;
};

const COINS_MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets";

const CACHE_TTL_MS = 60_000;

let cache: Coin[] | null = null;
let cacheTime = 0;
let inFlight: Promise<Coin[]> | null = null;

class MainService {
  private async fetchCoins(): Promise<Coin[]> {
    const { data } = await axios.get<ApiCoin[]>(COINS_MARKETS_URL, {
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: 100,
        page: 1,
        sparkline: false,
      },
    });

    if (!Array.isArray(data)) {
      throw new Error("Invalid API response");
    }

    return data
      .filter((c) => c?.current_price && c?.image)
      .map((c) => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        image: c.image!,
        current_price: c.current_price!,
      }));
  }

  async getCoins(name?: string, symbol?: string): Promise<Coin[]> {
    const now = Date.now();

    if (cache && now - cacheTime < CACHE_TTL_MS) {
      return this.filter(cache, name, symbol);
    }

    if (!inFlight) {
      inFlight = this.fetchCoins().finally(() => {
        inFlight = null;
      });
    }

    const data = await inFlight;

    cache = data;
    cacheTime = Date.now();

    return this.filter(data, name, symbol);
  }

  private filter(data: Coin[], name?: string, symbol?: string) {
    let result = data;

    if (name) {
      result = result.filter((c) =>
        c.name.toLowerCase().includes(name.toLowerCase())
      );
    }

    if (symbol) {
      result = result.filter((c) =>
        c.symbol.toLowerCase().includes(symbol.toLowerCase())
      );
    }

    return result;
  }
}

export default new MainService();