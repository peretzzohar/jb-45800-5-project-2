import { describe, expect, it } from 'vitest'
import { formatApiError } from './apiClient'

describe('formatApiError', () => {
  it('returns status message for HTTP errors', () => {
    const error = {
      isAxiosError: true,
      response: { status: 503 },
    }

    expect(formatApiError(error, 'Unable to load recommendations right now.')).toBe(
      'Unable to load recommendations right now. (status 503)'
    )
  })

  it('returns explicit too-many-requests message for 429', () => {
    const error = {
      isAxiosError: true,
      response: { status: 429 },
    }

    expect(formatApiError(error)).toBe('Too many requests. Please wait a moment and try again.')
  })
})
