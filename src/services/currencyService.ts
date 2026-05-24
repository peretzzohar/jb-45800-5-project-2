import axios from 'axios'

const DETAILS_CACHE_TTL_MS = 2 * 60_000

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

const DEFAULT_COINGECKO_PROXY_BASE = 'https://api.coingecko.com/api/v3/coins'
const BASE_URL = import.meta.env.VITE_SERVER_URL_CURRENCY || DEFAULT_COINGECKO_PROXY_BASE

class CurrencyService {
  private readonly detailsCache = new Map<string, { expiresAt: number; data: MultiCurrencyResponse }>()
  private readonly inFlightDetails = new Map<string, Promise<MultiCurrencyResponse>>()

  private isDirectCoinGeckoUrl(url: string): boolean {
    return /^https?:\/\/api\.coingecko\.com\/api\/v3\/coins\/?$/i.test(url)
  }

  private getNormalizedBaseUrl(): string {
    const raw = (BASE_URL || '').trim()

    if (!raw || this.isDirectCoinGeckoUrl(raw)) {
      return DEFAULT_COINGECKO_PROXY_BASE
    }

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
      timeout: 10_000,
    })

    return data
  }

  private getCachedCoinDetails(coinId: string): MultiCurrencyResponse | null {
    const cached = this.detailsCache.get(coinId)
    if (!cached) return null

    if (cached.expiresAt <= Date.now()) {
      this.detailsCache.delete(coinId)
      return null
    }

    return cached.data
  }

  private async getMultiCurrencyCoinDetails(coinId: string): Promise<MultiCurrencyResponse> {
    const cacheKey = coinId.trim().toLowerCase()
    const cached = this.getCachedCoinDetails(cacheKey)
    if (cached) return cached

    const inFlight = this.inFlightDetails.get(cacheKey)
    if (inFlight) return inFlight

    const request = this.getCoinById(coinId)
      .then((coinDetails) => {
        const data = {
          usd: [this.mapCoinDetailsToCoin(coinDetails, 'usd')],
          eur: [this.mapCoinDetailsToCoin(coinDetails, 'eur')],
          ils: [this.mapCoinDetailsToCoin(coinDetails, 'ils')],
        }

        this.detailsCache.set(cacheKey, {
          data,
          expiresAt: Date.now() + DETAILS_CACHE_TTL_MS,
        })

        return data
      })
      .finally(() => {
        this.inFlightDetails.delete(cacheKey)
      })

    this.inFlightDetails.set(cacheKey, request)
    return request
  }

  async getCoinsAll(coinId?: string): Promise<MultiCurrencyResponse> {
    const normalizedBase = this.getNormalizedBaseUrl()
    const shouldUseCoinDetails = Boolean(coinId) && this.isCoinsRootUrl(normalizedBase)

    if (shouldUseCoinDetails && coinId) {
      return this.getMultiCurrencyCoinDetails(coinId)
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