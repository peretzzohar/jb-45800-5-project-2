import axios, { type AxiosRequestConfig } from 'axios'

const DEFAULT_RETRIES = 2
const BASE_RETRY_DELAY_MS = 1_000
const MAX_RETRY_AFTER_MS = 60_000

type RetryOptions = {
  retries?: number
  retryDelayMs?: number
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function shouldRetry(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false

  const status = error.response?.status
  return status === 429 || status === 502 || status === 503 || status === 504 || !status
}

function getRetryDelayForAttempt(error: unknown, fallbackDelayMs: number): number {
  if (!axios.isAxiosError(error)) return fallbackDelayMs

  const retryAfterHeader = error.response?.headers?.['retry-after']

  if (typeof retryAfterHeader === 'string') {
    const numericSeconds = Number.parseInt(retryAfterHeader, 10)
    if (Number.isFinite(numericSeconds) && numericSeconds > 0) {
      return Math.min(numericSeconds * 1_000, MAX_RETRY_AFTER_MS)
    }

    const retryAt = Date.parse(retryAfterHeader)
    if (Number.isFinite(retryAt)) {
      const msUntilRetry = retryAt - Date.now()
      if (msUntilRetry > 0) {
        return Math.min(msUntilRetry, MAX_RETRY_AFTER_MS)
      }
    }
  }

  return fallbackDelayMs
}

export async function getJsonWithRetry<T>(
  url: string,
  config?: AxiosRequestConfig,
  options: RetryOptions = {}
): Promise<T> {
  const retries = options.retries ?? DEFAULT_RETRIES
  const retryDelayMs = options.retryDelayMs ?? BASE_RETRY_DELAY_MS
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await axios.get<T>(url, config)
      return response.data
    } catch (error) {
      lastError = error

      if (!shouldRetry(error) || attempt === retries) {
        throw error
      }

      const fallbackDelay = retryDelayMs * (attempt + 1)
      const retryDelay = getRetryDelayForAttempt(error, fallbackDelay)
      await wait(retryDelay)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed')
}

export function formatApiError(error: unknown, fallback = 'Unable to load data right now. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) {
      return 'Too many requests. Please wait a moment and try again.'
    }

    if (typeof error.response?.status === 'number') {
      return `${fallback} (status ${error.response.status})`
    }

    return 'Network error. Please check your connection and try again.'
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}
