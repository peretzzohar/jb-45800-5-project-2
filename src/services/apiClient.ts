import axios, { type AxiosRequestConfig } from 'axios'

const DEFAULT_RETRIES = 2
const BASE_RETRY_DELAY_MS = 1_000

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

      await wait(retryDelayMs * (attempt + 1))
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
