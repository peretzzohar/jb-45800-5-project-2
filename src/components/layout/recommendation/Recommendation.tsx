import { useEffect, useMemo, useState } from 'react'
import AiService, { type AiMetrics, type AiResult } from '../../../services/aiService.ts'
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
		return `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?market_data=true`
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

export default function Recommendation() {
	const [trackedCoinIds, setTrackedCoinIds] = useState<string[]>(() => readTrackedCoinIds())
	const [apiKey, setApiKey] = useState<string>(() => readSavedApiKey())
	const [selectedCoinId, setSelectedCoinId] = useState<string>(() => readLastSelectedCoin())
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [coinName, setCoinName] = useState('')
	const [result, setResult] = useState<AiResult | null>(null)

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

	const canRequest = useMemo(
		() => Boolean(selectedCoinId) && Boolean(apiKey.trim()),
		[selectedCoinId, apiKey],
	)

	const decisionClass = result ? `decision ${result.recommendation.toLowerCase()}` : 'decision'
	const decisionText = result ? `AI suggests ${result.recommendation}` : ''

	const handleGetRecommendation = async () => {
		try {
			setLoading(true)
			setError('')
			setResult(null)

			const recommendationUrl = buildRecommendationUrl(selectedCoinId)

			const coinResponse = await fetch(recommendationUrl)
			const coinData = (await coinResponse.json()) as CoinRecommendationResponse
			setCoinName(coinData.name)

			const metrics = extractPromptMetrics(coinData)
			const aiResult = await AiService.getRecommendation(metrics)
			setResult(aiResult)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error')
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
							{loading ? 'Getting AI recommendation...' : 'Get AI Recommendation'}
						</button>
					</>
				)}
			</form>

			{error && <p className='status-message error'>{error}</p>}

			{result && (
				<article className='recommendation-card'>
					<h3>{coinName}</h3>
					<p className={decisionClass}>{decisionText}</p>
					<p className='reason'>{result.explanation}</p>
				</article>
			)}
		</section>
	)
}
