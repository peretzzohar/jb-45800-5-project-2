import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import {
  createChart,
  ColorType,
	LineSeries,
  type IChartApi,
	type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import './Feed.css'

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
]

const BINANCE_KLINES_URL = 'https://api.binance.com/api/v3/klines'
const TRACKED_COIN_SYMBOLS_KEY = 'trackedCoinSymbols'
const INTERVAL = '5m'
const REFRESH_MS = 15000
const LIMIT = 250
const SERIES_COLORS: Record<string, string> = {
  BTCUSDT: '#f59e0b',
  ETHUSDT: '#60a5fa',
  BNBUSDT: '#facc15',
  XRPUSDT: '#a78bfa',
  DOGEUSDT: '#34d399',
  SOLUSDT: '#f87171',
}

type CoinRow = {
	symbol: string
	close: number | null
	changePct: number | null
}

function readTrackedSymbols(): string[] {
	try {
		const raw = localStorage.getItem(TRACKED_COIN_SYMBOLS_KEY)
		if (!raw) return []

		const parsed = JSON.parse(raw)
		if (!Array.isArray(parsed)) return []

		return parsed
			.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
			.map((x) => x.toUpperCase())
	} catch {
		return []
	}
}

function colorForSymbol(symbol: string, index: number): string {
	if (SERIES_COLORS[symbol]) return SERIES_COLORS[symbol]

	const fallback = ['#22c55e', '#eab308', '#3b82f6', '#f97316', '#a855f7', '#06b6d4']
	return fallback[index % fallback.length]
}

export default function Feed() {
	const chartContainerRef = useRef<HTMLDivElement | null>(null)
	const chartRef = useRef<IChartApi | null>(null)
	const seriesRef = useRef<Record<string, ISeriesApi<'Line'>>>({})

	const [watchedSymbols, setWatchedSymbols] = useState<string[]>(() => readTrackedSymbols())
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [rows, setRows] = useState<CoinRow[]>([])
	const [lastUpdated, setLastUpdated] = useState<string>('')

	useEffect(() => {
		const syncTracked = () => {
			setWatchedSymbols(readTrackedSymbols())
		}

		syncTracked()
		window.addEventListener('tracked-symbols-updated', syncTracked)
		window.addEventListener('storage', syncTracked)

		return () => {
			window.removeEventListener('tracked-symbols-updated', syncTracked)
			window.removeEventListener('storage', syncTracked)
		}
	}, [])

	useEffect(() => {
		if (!chartContainerRef.current) return

		const chart = createChart(chartContainerRef.current, {
			height: 520,
			layout: {
				textColor: '#d8e1ef',
				background: { type: ColorType.Solid, color: '#0e1726' },
			},
			grid: {
				vertLines: { color: 'rgba(88, 104, 130, 0.25)' },
				horzLines: { color: 'rgba(88, 104, 130, 0.25)' },
			},
			rightPriceScale: {
				borderColor: 'rgba(141, 160, 189, 0.45)',
			},
			timeScale: {
				borderColor: 'rgba(141, 160, 189, 0.45)',
				timeVisible: true,
				secondsVisible: false,
				tickMarkFormatter: (time: Time) => {
					if (typeof time === 'number') {
						const d = new Date(time * 1000)
						return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
					}

					return ''
				},
			},
			crosshair: {
				vertLine: {
					color: 'rgba(245, 158, 11, 0.35)',
					width: 1,
				},
				horzLine: {
					color: 'rgba(245, 158, 11, 0.35)',
					width: 1,
				},
			},
		})

		const seriesMap: Record<string, ISeriesApi<'Line'>> = {}

		for (const [index, symbol] of watchedSymbols.entries()) {
			seriesMap[symbol] = chart.addSeries(LineSeries, {
				color: colorForSymbol(symbol, index),
				lineWidth: 2,
				priceLineVisible: false,
				lastValueVisible: true,
				title: symbol.replace('USDT', ''),
			})
		}

		chartRef.current = chart
		seriesRef.current = seriesMap

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width } = entry.contentRect
				chart.applyOptions({ width })
			}
		})

		resizeObserver.observe(chartContainerRef.current)

		return () => {
			resizeObserver.disconnect()
			chart.remove()
			chartRef.current = null
			seriesRef.current = {}
		}
	}, [watchedSymbols])

	useEffect(() => {
		let isMounted = true

		const fetchLines = async () => {
			if (watchedSymbols.length === 0) {
				setRows([])
				setLoading(false)
				setError('Track coins in Home to watch them here.')
				return
			}

			try {
				if (isMounted) {
					setLoading(true)
					setError('')
				}

				const responses = await Promise.all(
					watchedSymbols.map((symbol) =>
						axios.get<BinanceKline[]>(BINANCE_KLINES_URL, {
							params: {
								symbol,
								interval: INTERVAL,
								limit: LIMIT,
							},
						})
					)
				)

				if (!isMounted) return

				const now = Date.now()
				const nextRows: CoinRow[] = []

				responses.forEach((response, idx) => {
					const symbol = watchedSymbols[idx]
					const closed = response.data.filter((kline) => kline[6] <= now)

					const lineData = closed.map((kline) => ({
						time: Math.floor(kline[0] / 1000) as UTCTimestamp,
						value: Number(kline[4]),
					}))

					seriesRef.current[symbol]?.setData(lineData)

					const last = lineData[lineData.length - 1]?.value ?? null
					const prev = lineData[lineData.length - 2]?.value ?? null

					let changePct: number | null = null
					if (last !== null && prev !== null && prev !== 0) {
						changePct = ((last - prev) / prev) * 100
					}

					nextRows.push({ symbol, close: last, changePct })
				})

				if (nextRows.every((row) => row.close === null)) {
					setError('No closed 5-minute candle data available yet.')
					return
				}

				setRows(nextRows)
				chartRef.current?.timeScale().fitContent()
				setLastUpdated(
					new Date().toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit',
					})
				)
			} catch {
				if (!isMounted) return
				setError('Failed to load Binance market line data.')
			} finally {
				if (isMounted) {
					setLoading(false)
				}
			}
		}

		fetchLines()
		const intervalId = window.setInterval(fetchLines, REFRESH_MS)

		return () => {
			isMounted = false
			window.clearInterval(intervalId)
		}
	}, [watchedSymbols])

	return (
		<section className='Feed'>
			<header className='feed-header'>
				<h2>Multi-Coin 5-Minute Lines</h2>
				<p>
					Source: Binance klines <span className='dot'>•</span> Interval: 5m (300s) <span className='dot'>•</span> Coins tracked in Home <span className='dot'>•</span> Last refresh: {lastUpdated || '--:--:--'}
				</p>
			</header>

			{loading && <p className='status-message'>Loading latest 5-minute lines...</p>}
			{error && <p className='status-message error'>{error}</p>}

			<section className='ohlc-panel'>
				{rows.map((row) => (
					<div key={row.symbol}>
						<span>{row.symbol.replace('USDT', '')}</span>
						<strong>{row.close === null ? '--' : row.close.toLocaleString()}</strong>
						<span className={row.changePct !== null && row.changePct < 0 ? 'delta neg' : 'delta pos'}>
							{row.changePct === null ? '--' : `${row.changePct >= 0 ? '+' : ''}${row.changePct.toFixed(2)}%`}
						</span>
					</div>
				))}
			</section>

			<div className='chart-shell'>
				<div ref={chartContainerRef} className='candles-container' />
			</div>
		</section>
	)
}