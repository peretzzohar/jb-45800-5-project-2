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

type GovCityRecord = {
  city_name?: string
  city?: string
  name?: string
  '\u05e9\u05dd_\u05d9\u05e9\u05d5\u05d1'?: string
}

type GovCityApiResponse = {
  result?: {
    records?: GovCityRecord[]
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

  private async getCoinById(coinId: string): Promise<CoinDetailsResponse> {
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

    return data
  }

  async getCoinsAll(coinId?: string): Promise<MultiCurrencyResponse> {
    const normalizedBase = this.getNormalizedBaseUrl()
    const shouldUseCoinDetails = Boolean(coinId) && this.isCoinsRootUrl(normalizedBase)

    if (shouldUseCoinDetails && coinId) {
      const coinDetails = await this.getCoinById(coinId)
      const usdCoin = this.mapCoinDetailsToCoin(coinDetails, 'usd')
      const eurCoin = this.mapCoinDetailsToCoin(coinDetails, 'eur')
      const ilsCoin = this.mapCoinDetailsToCoin(coinDetails, 'ils')

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

  async getCities(limit = 20): Promise<string[]> {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 20

    try {
      const { data } = await axios.get<GovCityApiResponse>(
        'https://data.gov.il/api/3/action/datastore_search',
        {
          params: {
            resource_id: '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba',
            limit: safeLimit,
          },
          timeout: 10_000,
        }
      )

      const names = (data.result?.records ?? [])
        .map((record) => record.city_name ?? record.city ?? record.name ?? record['\u05e9\u05dd_\u05d9\u05e9\u05d5\u05d1'])
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
        .map((name) => name.trim())

      const uniqueNames = Array.from(new Set(names))
      if (uniqueNames.length > 0) return uniqueNames.slice(0, safeLimit)
    } catch {
      // Fallback list keeps the template usable when API is unavailable.
    }

    return ['Jerusalem', 'Tel Aviv', 'Haifa', 'Rishon LeZion', 'Petah Tikva'].slice(0, safeLimit)
  }
}

export default new CurrencyService()