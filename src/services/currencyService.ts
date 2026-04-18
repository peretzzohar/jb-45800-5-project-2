import axios from 'axios'

type Coin = {
  id: string
  name: string
  symbol: string
  image: string
  current_price: number
}

type MultiCurrencyResponse = {
  usd: Coin[]
  eur: Coin[]
  ils: Coin[]
}

type CoinDetailsResponse = {
  id: string
  name: string
  symbol: string
  image: {
    thumb?: string
    small?: string
    large?: string
  }
  market_data?: {
    current_price?: {
      usd?: number
      eur?: number
      ils?: number
    }
  }
}

const BASE_URL = import.meta.env.VITE_SERVER_URL_CURRENCY

class CurrencyService {

  private getNormalizedBaseUrl(): string {
    const raw = (BASE_URL || '').trim()
    return raw.endsWith('/') ? raw.slice(0, -1) : raw
  }

  private isCoinsRootUrl(url: string): boolean {
    return /\/coins$/i.test(url)
  }

  private getCoinDetailsUrl(coinId: string): string {
    const normalizedBase = this.getNormalizedBaseUrl()

    if (this.isCoinsRootUrl(normalizedBase)) {
      return `${normalizedBase}/${encodeURIComponent(coinId)}`
    }

    return normalizedBase
  }

  private getMarketsUrl(): string {
    const normalizedBase = this.getNormalizedBaseUrl()

    if (this.isCoinsRootUrl(normalizedBase)) {
      return `${normalizedBase}/markets`
    }

    return normalizedBase
  }

  private mapCoinDetailsToCoin(details: CoinDetailsResponse, currency: 'usd' | 'eur' | 'ils'): Coin {
    return {
      id: details.id,
      name: details.name,
      symbol: details.symbol,
      image: details.image.large || details.image.small || details.image.thumb || '',
      current_price: details.market_data?.current_price?.[currency] ?? 0,
    }
  }

  private async getCoinByIdAndCurrency(coinId: string, currency: 'usd' | 'eur' | 'ils'): Promise<Coin> {
    const url = this.getCoinDetailsUrl(coinId)

    const { data } = await axios.get<CoinDetailsResponse>(url, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false,
      },
    })

    return this.mapCoinDetailsToCoin(data, currency)
  }

  async getCoinsAll(coinId?: string): Promise<MultiCurrencyResponse> {
    const normalizedBase = this.getNormalizedBaseUrl()
    const shouldUseCoinDetails = Boolean(coinId) && this.isCoinsRootUrl(normalizedBase)

    if (shouldUseCoinDetails) {
      const requestedCoinId = coinId as string

      const [usdCoin, eurCoin, ilsCoin] = await Promise.all([
        this.getCoinByIdAndCurrency(requestedCoinId, 'usd'),
        this.getCoinByIdAndCurrency(requestedCoinId, 'eur'),
        this.getCoinByIdAndCurrency(requestedCoinId, 'ils'),
      ])

      return {
        usd: [usdCoin],
        eur: [eurCoin],
        ils: [ilsCoin],
      }
    }

    const marketsUrl = this.getMarketsUrl()

    const [usd, eur, ils] = await Promise.all([
      axios.get<Coin[]>(marketsUrl, {
        params: { vs_currency: 'usd' }
      }),
      axios.get<Coin[]>(marketsUrl, {
        params: { vs_currency: 'eur' }
      }),
      axios.get<Coin[]>(marketsUrl, {
        params: { vs_currency: 'ils' }
      })
    ])

    return {
      usd: usd.data,
      eur: eur.data,
      ils: ils.data
    }
  }
}

export default new CurrencyService()