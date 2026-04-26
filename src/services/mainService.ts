import axios, { AxiosError } from 'axios'

export type Coin = {
  id: string
  name: string
  symbol: string
  image: string
  current_price: number
}

type ApiCoin = {
  id: string
  name: string
  symbol: string
  image?: string
  current_price?: number
}

export type GetCoinsOptions = {
  search?: string
  limit?: number
  forceRefresh?: boolean
}

const CACHE_TTL_MS = 60_000
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 250
const RETRY_COUNT = 2
const RETRY_DELAY_MS = 1_500

const api = axios.create({
  baseURL: '/api',
  timeout: 12_000,
})

let cache: Coin[] | null = null
let cacheTime = 0
let inFlight: Promise<Coin[]> | null = null

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isRetryableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false

  const status = error.response?.status
  return status === 429 || !status
}

function toErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) return 'Rate limited by CoinGecko. Please try again in a moment.'
    if (error.response?.status) return `CoinGecko request failed with status ${error.response.status}.`
    return 'Network error while calling CoinGecko.'
  }

  return 'Unexpected error while loading coins.'
}

async function getWithRetry<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt += 1) {
    try {
      const response = await api.get<T>(url, { params })
      return response.data
    } catch (error) {
      lastError = error

      if (!isRetryableError(error) || attempt === RETRY_COUNT) {
        throw error
      }

      const backoff = RETRY_DELAY_MS * (attempt + 1)
      await wait(backoff)
    }
  }

  throw lastError instanceof AxiosError ? lastError : new Error('Failed to load data.')
}

function normalizeCoin(coin: ApiCoin): Coin | null {
  if (!coin?.id || !coin?.name || !coin?.symbol || !coin?.image || typeof coin.current_price !== 'number') {
    return null
  }

  return {
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol,
    image: coin.image,
    current_price: coin.current_price,
  }
}

function applySearch(data: Coin[], search?: string): Coin[] {
  const normalizedSearch = search?.trim().toLowerCase()
  if (!normalizedSearch) return data

  return data.filter(
    (coin) =>
      coin.symbol.toLowerCase().includes(normalizedSearch) ||
      coin.name.toLowerCase().includes(normalizedSearch)
  )
}

class MainService {
  private async fetchCoins(limit: number): Promise<Coin[]> {
    try {
      const data = await getWithRetry<ApiCoin[]>('/coins/markets', {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: limit,
        page: 1,
        sparkline: false,
      })

      if (!Array.isArray(data)) {
        throw new Error('Invalid API response')
      }

      return data
        .map(normalizeCoin)
        .filter((coin): coin is Coin => coin !== null)
    } catch (error) {
      throw new Error(toErrorMessage(error))
    }
  }

  async getCoins(options: GetCoinsOptions = {}): Promise<Coin[]> {
    const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
    const now = Date.now()

    if (!options.forceRefresh && cache && now - cacheTime < CACHE_TTL_MS) {
      return applySearch(cache, options.search)
    }

    if (!inFlight) {
      inFlight = this.fetchCoins(limit).finally(() => {
        inFlight = null
      })
    }

    const data = await inFlight
    cache = data
    cacheTime = Date.now()

    return applySearch(data, options.search)
  }

  clearCache(): void {
    cache = null
    cacheTime = 0
  }
}

export default new MainService()