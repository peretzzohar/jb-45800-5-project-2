import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import OpenAI from 'openai'
import './Recommendation.css'
 
const TRACKED_COIN_IDS_KEY = 'trackedCoinIds'
const OPENAI_API_KEY_STORAGE_KEY = 'openAiApiKey'
const RECOMMENDATION_URL = import.meta.env.VITE_AI_RECOMMENDATION_URL as string | undefined
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const CHAT_GPT_API_KEY_FROM_ENV =
	(import.meta.env.VITE_NVIDIA_KEY as string | undefined) ||
	(import.meta.env.VITE_CHAT_GPT_API_KEY as string | undefined) ||
	(import.meta.env.VITE_OPENAI_API_KEY as string | undefined)
const COIN_ID_PLACEHOLDER = '<coin-id>'

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

type RecommendationResult = {
	worthBuying: boolean
	title: string
	reason: string
}

type AiRecommendationPayload = {
	name: string
	usd_price_current: number
	usd_cap_market: number
	usd_h24_volume: number
	currency_in_d30_percentage_change_price: number | null
	currency_in_d60_percentage_change_price: number | null
	currency_in_d200_percentage_change_price: number | null
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
		return typeof raw === 'string' ? raw : ''
	} catch {
		return ''
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

function extractPromptMetrics(data: CoinRecommendationResponse): AiRecommendationPayload {
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

function parseModelRecommendation(content: string): RecommendationResult {
	const trimmed = content.trim()
	let worthBuying = false
	let reason = trimmed

	try {
		const parsed = JSON.parse(trimmed) as {
			should_buy?: boolean
			explanation?: string
			recommendation?: string
		}

		worthBuying = Boolean(parsed.should_buy)
		reason =
			typeof parsed.explanation === 'string' && parsed.explanation.trim() !== ''
				? parsed.explanation.trim()
				: trimmed

		if (typeof parsed.recommendation === 'string') {
			const normalized = parsed.recommendation.toLowerCase()
			if (normalized.includes('buy') && !normalized.includes('not')) {
				worthBuying = true
			}
		}
	} catch {
		const normalized = trimmed.toLowerCase()
		worthBuying = normalized.includes('buy') && !normalized.includes('not buy')
	}

	return {
		worthBuying,
		title: worthBuying ? 'AI suggests buying' : 'AI suggests not buying now',
		reason,
	}
}

async function requestAiRecommendation(
	metrics: AiRecommendationPayload,
	apiKey: string,
): Promise<RecommendationResult> {
	if (!apiKey || apiKey.trim() === '') {
		throw new Error('Missing API key for NVIDIA chat completions request')
	}

	const systemMessage =
		'You are a cautious crypto analyst. Reply ONLY in valid JSON with keys: should_buy (boolean), explanation (string).'

	const userMessage = `Analyze this currency and decide if it should be purchased right now.\n\n${JSON.stringify(
		metrics,
		null,
		2,
	)}\n\nRules:\n- Use the provided fields only.\n- Be concise but clear.\n- Mention trend signals from 30d, 60d, and 200d changes when available.\n- Include risk caveat in explanation.`

	const openai = new OpenAI({
		apiKey,
		baseURL: NVIDIA_BASE_URL,
		dangerouslyAllowBrowser: true,
	})

	const completion = await openai.chat.completions.create({
		model: 'nvidia/llama-3.1-nemotron-safety-guard-8b-v3',
		messages: [
			{ role: 'system', content: systemMessage },
			{ role: 'user', content: userMessage },
		],
		stream: false,
	})

	const content = completion.choices?.[0]?.message?.content
	if (!content || content.trim() === '') {
		throw new Error('AI response is empty')
	}

	return parseModelRecommendation(content)
}

export default function Recommendation() {
	const [trackedCoinIds, setTrackedCoinIds] = useState<string[]>(() => readTrackedCoinIds())
	const [openAiApiKey, setOpenAiApiKey] = useState<string>(
		() => readSavedApiKey() || CHAT_GPT_API_KEY_FROM_ENV || '',
	)
	const [selectedCoinId, setSelectedCoinId] = useState<string>('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [coinName, setCoinName] = useState('')
	const [result, setResult] = useState<RecommendationResult | null>(null)

	useEffect(() => {
		try {
			if (openAiApiKey.trim()) {
				localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, openAiApiKey)
			} else {
				localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY)
			}
		} catch {
			// Ignore localStorage errors (e.g., private mode restrictions).
		}
	}, [openAiApiKey])

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
			return
		}

		if (!trackedCoinIds.includes(selectedCoinId)) {
			setSelectedCoinId(trackedCoinIds[0])
		}
	}, [selectedCoinId, trackedCoinIds])

	const canRequest = useMemo(
		() => Boolean(selectedCoinId) && Boolean(openAiApiKey.trim()),
		[selectedCoinId, openAiApiKey],
	)

	const handleGetRecommendation = async () => {
		if (!selectedCoinId) return

		try {
			setLoading(true)
			setError('')
			setResult(null)

			const url = buildRecommendationUrl(selectedCoinId)
			const { data } = await axios.get<CoinRecommendationResponse>(url, {
				params: {
					localization: false,
					tickers: false,
					community_data: false,
					developer_data: false,
					sparkline: false,
				},
			})

			setCoinName(data.name)
			const metrics = extractPromptMetrics(data)
			const aiResult = await requestAiRecommendation(metrics, openAiApiKey)
			setResult(aiResult)
		} catch (err) {
			if (axios.isAxiosError(err)) {
				setError(err.response?.data?.error?.message || 'Failed to fetch AI recommendation.')
				return
			}

			if (err instanceof Error) {
				setError(err.message)
				return
			}

			setError('Failed to fetch AI recommendation.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<section className='Recommendation'>
			<header className='recommendation-header'>
				<h2>AI Recommendation</h2>
				<p>Only tracked coins from Home are shown here.</p>
			</header>

			<form
				onSubmit={(event) => {
					event.preventDefault()
					void handleGetRecommendation()
				}}
			>

			<div className='api-key-panel'>
				<label htmlFor='openai-api-key'>OpenAI API Key</label>
				<input
					id='openai-api-key'
					type='password'
					placeholder='Paste your VITE_OPENAI_API_KEY here'
					value={openAiApiKey}
					onChange={(event) => setOpenAiApiKey(event.target.value)}
					autoComplete='off'
				/>
			</div>

			{!trackedCoinIds.length && (
				<p className='status-message'>No tracked coins yet. Go to Home and switch coins on first.</p>
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
									onChange={() => setSelectedCoinId(coinId)}
								/>
								{coinId}
							</label>
						))}
					</div>

					<button
						type='submit'
						className='recommend-btn'
						disabled={!canRequest || loading}
					>
						{loading ? 'Loading recommendation...' : 'Get Recommendation'}
					</button>
				</>
			)}
			</form>

			{error && <p className='status-message error'>{error}</p>}

			{result && (
				<article className='recommendation-card'>
					<h3>{coinName}</h3>
					<p className={result.worthBuying ? 'decision buy' : 'decision avoid'}>
						{result.title}
					</p>
					<p className='reason'>{result.reason}</p>
				</article>
			)}
		</section>
	)
}
