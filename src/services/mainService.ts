import axios from "axios";

export type Coin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
};

type ApiCoin = Omit<Coin, "current_price" | "image"> & {
  current_price: number | null;
  image?: string | null;
};

export type coinResponse = Coin[];

const COINS_MARKETS_URL = "/api/coins/markets";
const CACHE_TTL_MS = 60_000;

let coinsCache: Coin[] | null = null;
let cacheTimestamp = 0;
let inFlightRequest: Promise<Coin[]> | null = null;

class MainService {
  private async fetchCoinsFromApi(): Promise<Coin[]> {
    try {
      const { data } = await axios.get<ApiCoin[]>(COINS_MARKETS_URL, {
        params: {
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page: 100,
          page: 1,
          sparkline: false,
        },
      });

      data.forEach((c) => {
        if (c.current_price == null) {
          console.log("BROKEN COIN:", c);
        }
      });

      const filtered = data.filter(
        (c) =>
          c &&
          typeof c.current_price === "number" &&
          typeof c.image === "string" &&
          c.image.trim() !== ""
      );

      const normalized: Coin[] = filtered.map((c) => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        image: c.image as string,
        current_price: c.current_price as number,
      }));

      return normalized;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        throw new Error("Rate limit reached. Please wait a moment and try again.");
      }

      throw error;
    }
  }

  async getCoins(name?: string, symbol?: string): Promise<coinResponse> {
    const now = Date.now();

    if (coinsCache && now - cacheTimestamp < CACHE_TTL_MS) {
      let filteredFromCache = coinsCache;

      if (name) {
        filteredFromCache = filteredFromCache.filter((c) =>
          c.name.toLowerCase().includes(name.toLowerCase())
        );
      }

      if (symbol) {
        filteredFromCache = filteredFromCache.filter((c) =>
          c.symbol.toLowerCase().includes(symbol.toLowerCase())
        );
      }

      return filteredFromCache;
    }

    if (!inFlightRequest) {
      inFlightRequest = this.fetchCoinsFromApi();
    }

    const data = await inFlightRequest.finally(() => {
      inFlightRequest = null;
    });

    coinsCache = data;
    cacheTimestamp = Date.now();

    let filtered = data;

    if (name) {
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(name.toLowerCase())
      );
    }

    if (symbol) {
      filtered = filtered.filter((c) =>
        c.symbol.toLowerCase().includes(symbol.toLowerCase())
      );
    }

    return filtered;
  }
}

export default new MainService();