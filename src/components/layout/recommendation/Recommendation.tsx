import { useEffect, useMemo, useState } from 'react'
import AiService, { type AiMetrics, type AiResult } from '../../../services/aiService.ts'
import { formatApiError, getJsonWithRetry } from '../../../services/apiClient'
import Spinner from '../../common/spinner/Spinner'
import './Recommendation.css'

const TRACKED_COIN_IDS_KEY = 'trackedCoinIds'
const OPENAI_API_KEY_STORAGE_KEY = 'openAiApiKey'
const LAST_SELECTED_COIN_KEY = 'lastRecommendedCoinId'
const COIN_ID_PLACEHOLDER = '<coin-id>'

const RECOMMENDATION_URL = import.meta.env.VITE_AI_RECOMMENDATION_URL as string | undefined
const NVIDIA_KEY_FROM_ENV = import.meta.env.VITE_NVIDIA_KEY as string | undefined

type CoinRecommendationResponse = {
	id: string
	name: string
	symbol: string
	market_data?: {
		current_price?: {
			usd?: number
		}
		market_cap?: {
			usd?: number
		}
		total_volume?: {
			usd?: number
		}
		price_change_percentage_30d_in_currency?: {
			usd?: number
		}
		price_change_percentage_60d_in_currency?: {
			usd?: number
		}
		price_change_percentage_200d_in_currency?: {
			usd?: number
		}
	}
}

function readTrackedCoinIds(): string[] {
	try {
		const raw = localStorage.getItem(TRACKED_COIN_IDS_KEY)
		if (!raw) return []

		const parsed = JSON.parse(raw)
		if (!Array.isArray(parsed)) return []

		return parsed.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
	} catch {
		return []
	}
}

function readSavedApiKey(): string {
	try {
		const raw = localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY)
		if (typeof raw === 'string' && raw.trim() !== '') return raw
		return NVIDIA_KEY_FROM_ENV || ''
	} catch {
		return NVIDIA_KEY_FROM_ENV || ''
	}
}

function readLastSelectedCoin(): string {
	try {
		const raw = localStorage.getItem(LAST_SELECTED_COIN_KEY)
		return typeof raw === 'string' ? raw : ''
	} catch {
		return ''
	}
}

function saveLastSelectedCoin(coinId: string): void {
	try {
		if (coinId.trim()) {
			localStorage.setItem(LAST_SELECTED_COIN_KEY, coinId)
		} else {
			localStorage.removeItem(LAST_SELECTED_COIN_KEY)
		}
	} catch {
		// Ignore storage errors.
	}
}

function buildRecommendationUrl(coinId: string): string {
	if (!RECOMMENDATION_URL || RECOMMENDATION_URL.trim() === '') {
		return `/api/coins/${encodeURIComponent(coinId)}?market_data=true`
	}

	if (RECOMMENDATION_URL.includes(COIN_ID_PLACEHOLDER)) {
		return RECOMMENDATION_URL.replace(COIN_ID_PLACEHOLDER, encodeURIComponent(coinId))
	}

	return `${RECOMMENDATION_URL.replace(/\/$/, '')}/${encodeURIComponent(coinId)}?market_data=true`
}

function extractPromptMetrics(data: CoinRecommendationResponse): AiMetrics {
	return {
		name: data.name,
		usd_price_current: data.market_data?.current_price?.usd ?? 0,
		usd_cap_market: data.market_data?.market_cap?.usd ?? 0,
		usd_h24_volume: data.market_data?.total_volume?.usd ?? 0,
		currency_in_d30_percentage_change_price:
			data.market_data?.price_change_percentage_30d_in_currency?.usd ?? null,
		currency_in_d60_percentage_change_price:
			data.market_data?.price_change_percentage_60d_in_currency?.usd ?? null,
		currency_in_d200_percentage_change_price:
			data.market_data?.price_change_percentage_200d_in_currency?.usd ?? null,
	}
}

async function getCoinRecommendationData(url: string): Promise<CoinRecommendationResponse> {
	return getJsonWithRetry<CoinRecommendationResponse>(url)
}

export default function Recommendation() {
	const [trackedCoinIds, setTrackedCoinIds] = useState<string[]>(() => readTrackedCoinIds())
	const [apiKey, setApiKey] = useState<string>(() => readSavedApiKey())
	const [selectedCoinId, setSelectedCoinId] = useState<string>(() => readLastSelectedCoin())
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [resultsByCoinId, setResultsByCoinId] = useState<Record<string, { coinName: string; result: AiResult }>>({})

	useEffect(() => {
		try {
			if (apiKey.trim()) {
				localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, apiKey)
			} else {
				localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY)
			}
		} catch {
			// Ignore storage errors.
		}
	}, [apiKey])

	useEffect(() => {
		const syncTracked = () => {
			setTrackedCoinIds(readTrackedCoinIds())
		}

		window.addEventListener('tracked-symbols-updated', syncTracked)
		window.addEventListener('storage', syncTracked)

		return () => {
			window.removeEventListener('tracked-symbols-updated', syncTracked)
			window.removeEventListener('storage', syncTracked)
		}
	}, [])

	useEffect(() => {
		if (!trackedCoinIds.length) {
			setSelectedCoinId('')
			saveLastSelectedCoin('')
			return
		}

		if (selectedCoinId && trackedCoinIds.includes(selectedCoinId)) {
			saveLastSelectedCoin(selectedCoinId)
			return
		}

		setSelectedCoinId(trackedCoinIds[0])
		saveLastSelectedCoin(trackedCoinIds[0])
	}, [selectedCoinId, trackedCoinIds])

	const canRequest = useMemo(() => Boolean(trackedCoinIds.length) && Boolean(apiKey.trim()), [trackedCoinIds.length, apiKey])

	const selectedEntry = resultsByCoinId[selectedCoinId]
	const selectedResult = selectedEntry?.result ?? null
	const selectedCoinName = selectedEntry?.coinName ?? selectedCoinId

	const decisionClass = selectedResult ? `decision ${selectedResult.recommendation.toLowerCase()}` : 'decision'
	const decisionText = selectedResult ? `AI suggests ${selectedResult.recommendation}` : ''

	const handleGetRecommendation = async () => {
		try {
			setLoading(true)
			setError('')

			if (!trackedCoinIds.length) {
				setResultsByCoinId({})
				return
			}

			const settledResults = await Promise.allSettled(
				trackedCoinIds.map(async (coinId) => {
					const recommendationUrl = buildRecommendationUrl(coinId)
					const coinData = await getCoinRecommendationData(recommendationUrl)
					const metrics = extractPromptMetrics(coinData)
					const aiResult = await AiService.getRecommendation(metrics)

					return {
						coinId,
						coinName: coinData.name || coinId,
						result: aiResult,
					}
				})
			)

			const nextResults: Record<string, { coinName: string; result: AiResult }> = {}
			let failedCount = 0

			settledResults.forEach((entry) => {
				if (entry.status === 'fulfilled') {
					nextResults[entry.value.coinId] = {
						coinName: entry.value.coinName,
						result: entry.value.result,
					}
					return
				}

				failedCount += 1
			})

			setResultsByCoinId(nextResults)

			if (failedCount > 0) {
				setError('Some recommendations could not be loaded. Please try again.')
			}
		} catch (err) {
			setError(formatApiError(err, 'Unable to load recommendations right now. Please try again.'))
		} finally {
			setLoading(false)
		}
	}

	return (
		<section className='Recommendation'>
			<header className='recommendation-header'>
				<h2>AI Crypto Recommendation</h2>
				<p>Select a tracked coin and get a real-time BUY, HOLD, or SELL signal from AI.</p>
			</header>

			<form
				onSubmit={(event) => {
					event.preventDefault()
					void handleGetRecommendation()
				}}
			>
				<div className='api-key-panel'>
					<label htmlFor='ai-api-key'>Enter your AI API Key</label>
					<input
						id='ai-api-key'
						type='password'
						placeholder='Paste your NVIDIA or OpenAI API key'
						value={apiKey}
						onChange={(event) => setApiKey(event.target.value)}
						autoComplete='off'
					/>
				</div>

				{!trackedCoinIds.length && (
					<p className='status-message'>No tracked coins yet. Go to Home and track at least one coin.</p>
				)}

				{!!trackedCoinIds.length && (
					<>
						<div className='radio-list'>
							{trackedCoinIds.map((coinId) => (
								<label key={coinId} className='radio-item'>
									<input
										type='radio'
										name='tracked-coin'
										value={coinId}
										checked={selectedCoinId === coinId}
										onChange={() => {
											setSelectedCoinId(coinId)
											saveLastSelectedCoin(coinId)
										}}
									/>
									{coinId}
								</label>
							))}
						</div>

						<button type='submit' className='recommend-btn' disabled={!canRequest || loading}>
							{loading ? 'Getting AI recommendations...' : 'Get AI Recommendations'}
						</button>
					</>
				)}
			</form>

			{error && <p className='status-message error'>{error}</p>}
			{loading && <Spinner label='Getting AI recommendations...' />}

			{selectedResult && (
				<article className='recommendation-card'>
					<h3>{selectedCoinName}</h3>
					<p className={decisionClass}>{decisionText}</p>
					<p className='reason'>{selectedResult.explanation}</p>
				</article>
			)}
		</section>
	)
}
