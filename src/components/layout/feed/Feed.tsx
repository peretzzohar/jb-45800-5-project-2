import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import mainService from '../../../services/mainService'
import { formatApiError, getJsonWithRetry } from '../../../services/apiClient'
import {
	createChart,
	AreaSeries,
	ColorType,
	CrosshairMode,
	LineSeries,
	LineStyle,
	type IChartApi,
	type ISeriesApi,
	type LineData,
	type Time,
	type UTCTimestamp,
} from 'lightweight-charts'
import Spinner from '../../common/spinner/Spinner'
import './Feed.css'

const TRACKED_COIN_SYMBOLS_KEY = 'trackedCoinSymbols'
const LIVE_REFRESH_MS = 15_000
const HISTORY_DAYS = 30
const HOURS_LIMIT = HISTORY_DAYS * 24
const MAX_POINTS = HOURS_LIMIT
const SMA_PERIOD = 20
const MAX_SYMBOLS = 5

const SERIES_COLORS = ['#f59e0b', '#22c55e', '#60a5fa', '#f43f5e', '#14b8a6', '#f97316', '#a78bfa']

type CoinRow = {
	symbol: string
	price: number | null
	changePct24h: number | null
}

type TooltipState = {
	x: number
	y: number
	symbol: string
	price: number
	time: string
	changePct: number | null
}

type UiState = {
	selectedSymbol: string
	visibilityBySymbol: Record<string, boolean>
}

type HistoryPoint = {
	time: number | string
	close: number
}

type CryptoCompareHistoryResponse = {
	Response: string
	Data?: {
		Data: HistoryPoint[]
	}
}

type LivePricesResponse = Record<string, { USD?: number }>

type DashboardSeries = {
	price: ISeriesApi<'Area'>
	sma: ISeriesApi<'Line'>
	minLine?: ReturnType<ISeriesApi<'Area'>['createPriceLine']>
	maxLine?: ReturnType<ISeriesApi<'Area'>['createPriceLine']>
	color: string
}

function normalizeTrackedSymbol(symbol: string): string {
	return symbol.toUpperCase().replace(/USDT$/, '')
}

function normalizeTime(rawTime: number | string): number {
	if (typeof rawTime === 'string') return new Date(rawTime).getTime()
	if (rawTime > 1e12) return rawTime
	return rawTime * 1000
}

function buildHistoryUrl(symbol: string): string {
	const fsym = normalizeTrackedSymbol(symbol)
	return `https://min-api.cryptocompare.com/data/v2/histohour?fsym=${encodeURIComponent(fsym)}&tsym=USD&limit=${HOURS_LIMIT}&aggregate=1`
}

function buildLivePricesUrl(symbols: string[]): string {
	const fsyms = symbols.map((symbol) => normalizeTrackedSymbol(symbol)).join(',')
	return `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${encodeURIComponent(fsyms)}&tsyms=USD`
}

function readTrackedSymbols(): string[] {
	try {
		const raw = localStorage.getItem(TRACKED_COIN_SYMBOLS_KEY)
		if (!raw) return []
		const parsed = JSON.parse(raw)
		if (!Array.isArray(parsed)) return []

		return parsed
			.filter((item): item is string => typeof item === 'string')
			.map((item) => item.toUpperCase())
			.slice(0, MAX_SYMBOLS)
	} catch {
		return []
	}
}

function calculateSma(data: LineData[], period: number): LineData[] {
	if (data.length < period) return []

	const smaData: LineData[] = []
	let rollingSum = 0

	for (let i = 0; i < data.length; i += 1) {
		rollingSum += data[i].value

		if (i >= period) {
			rollingSum -= data[i - period].value
		}

		if (i >= period - 1) {
			smaData.push({
				time: data[i].time,
				value: rollingSum / period,
			})
		}
	}

	return smaData
}

function calculate24hChange(lineData: LineData[]): number | null {
	const last = lineData[lineData.length - 1]?.value
	const dayAgo = lineData[lineData.length - 25]?.value
	if (last == null || dayAgo == null || dayAgo === 0) return null
	return ((last - dayAgo) / dayAgo) * 100
}

function hexToRgba(hex: string, alpha: number): string {
	const normalized = hex.replace('#', '')
	if (normalized.length !== 6) return `rgba(255, 255, 255, ${alpha})`

	const r = Number.parseInt(normalized.slice(0, 2), 16)
	const g = Number.parseInt(normalized.slice(2, 4), 16)
	const b = Number.parseInt(normalized.slice(4, 6), 16)
	return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getValueAtCrosshair(item: unknown): number | null {
	if (typeof item !== 'object' || item === null) return null

	if ('value' in item && typeof (item as { value?: unknown }).value === 'number') {
		return (item as { value: number }).value
	}

	if ('close' in item && typeof (item as { close?: unknown }).close === 'number') {
		return (item as { close: number }).close
	}

	return null
}

function formatChartTime(time: Time): string {
	if (typeof time === 'number') return new Date(time * 1000).toLocaleString()
	if (typeof time === 'string') return new Date(time).toLocaleString()

	const dd = String(time.day).padStart(2, '0')
	const mm = String(time.month).padStart(2, '0')
	return `${dd}/${mm}/${time.year}`
}

function formatPrice(value: number | null): string {
	if (value == null) return 'N/A'
	return value.toLocaleString(undefined, {
		minimumFractionDigits: value >= 1000 ? 2 : 4,
		maximumFractionDigits: value >= 1000 ? 2 : 4,
	})
}

export default function Feed() {
	const chartContainerRef = useRef<HTMLDivElement | null>(null)
	const chartRef = useRef<IChartApi | null>(null)
	const resizeObserverRef = useRef<ResizeObserver | null>(null)
	const seriesRef = useRef<Record<string, DashboardSeries>>({})
	const historyRef = useRef<Record<string, LineData[]>>({})

	const [watchedSymbols, setWatchedSymbols] = useState<string[]>(() => readTrackedSymbols())
	const [ui, setUi] = useState<UiState>({ selectedSymbol: '', visibilityBySymbol: {} })
	const [rows, setRows] = useState<CoinRow[]>([])
	const [logoBySymbol, setLogoBySymbol] = useState<Record<string, string>>({})
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [lastUpdated, setLastUpdated] = useState('')
	const [tooltip, setTooltip] = useState<TooltipState | null>(null)

	const watchedSymbolsRef = useRef<string[]>(watchedSymbols)
	const uiRef = useRef<UiState>(ui)
	const selectedSymbolRef = useRef('')
	const firstLoadRef = useRef(true)

	useEffect(() => {
		watchedSymbolsRef.current = watchedSymbols
	}, [watchedSymbols])

	useEffect(() => {
		uiRef.current = ui
	}, [ui])

	const effectiveVisibility = useMemo(() => {
		const next: Record<string, boolean> = {}
		watchedSymbols.forEach((symbol) => {
			next[symbol] = ui.visibilityBySymbol[symbol] ?? true
		})
		return next
	}, [ui.visibilityBySymbol, watchedSymbols])

	const selectedSymbol = useMemo(() => {
		if (ui.selectedSymbol && watchedSymbols.includes(ui.selectedSymbol)) return ui.selectedSymbol
		return watchedSymbols[0] ?? ''
	}, [ui.selectedSymbol, watchedSymbols])

	useEffect(() => {
		selectedSymbolRef.current = selectedSymbol
	}, [selectedSymbol])

	const syncWatchedSymbols = useCallback(() => {
		setWatchedSymbols(readTrackedSymbols())
	}, [])

	const applyMinMaxLines = useCallback((symbol: string, data: LineData[]) => {
		const dashboardSeries = seriesRef.current[symbol]
		if (!dashboardSeries) return

		if (dashboardSeries.minLine) {
			dashboardSeries.price.removePriceLine(dashboardSeries.minLine)
			dashboardSeries.minLine = undefined
		}

		if (dashboardSeries.maxLine) {
			dashboardSeries.price.removePriceLine(dashboardSeries.maxLine)
			dashboardSeries.maxLine = undefined
		}

		if (symbol !== selectedSymbolRef.current || data.length === 0) return

		let minValue = data[0].value
		let maxValue = data[0].value

		for (let i = 1; i < data.length; i += 1) {
			if (data[i].value < minValue) minValue = data[i].value
			if (data[i].value > maxValue) maxValue = data[i].value
		}

		dashboardSeries.minLine = dashboardSeries.price.createPriceLine({
			price: minValue,
			title: 'MIN',
			color: '#ff2d55',
			lineWidth: 3,
			lineStyle: LineStyle.Solid,
			axisLabelVisible: true,
		})

		dashboardSeries.maxLine = dashboardSeries.price.createPriceLine({
			price: maxValue,
			title: 'MAX',
			color: '#00e5ff',
			lineWidth: 3,
			lineStyle: LineStyle.Solid,
			axisLabelVisible: true,
		})
	}, [])

	const patchSeriesData = useCallback((symbol: string, nextData: LineData[]) => {
		const dashboardSeries = seriesRef.current[symbol]
		if (!dashboardSeries) return

		const previous = historyRef.current[symbol] ?? []
		const sma = calculateSma(nextData, SMA_PERIOD)

		if (
			previous.length === 0 ||
			nextData.length === 0 ||
			nextData.length < previous.length ||
			nextData[0]?.time !== previous[0]?.time
		) {
			dashboardSeries.price.setData(nextData)
			dashboardSeries.sma.setData(sma)
			historyRef.current[symbol] = nextData
			applyMinMaxLines(symbol, nextData)
			return
		}

		const previousLast = previous[previous.length - 1]
		const nextLast = nextData[nextData.length - 1]

		if (!previousLast || !nextLast) {
			dashboardSeries.price.setData(nextData)
			dashboardSeries.sma.setData(sma)
			historyRef.current[symbol] = nextData
			applyMinMaxLines(symbol, nextData)
			return
		}

		if (nextLast.time > previousLast.time) {
			for (let i = previous.length; i < nextData.length; i += 1) {
				dashboardSeries.price.update(nextData[i])
			}
		} else if (nextLast.time === previousLast.time && nextLast.value !== previousLast.value) {
			dashboardSeries.price.update(nextLast)
		}

		dashboardSeries.sma.setData(sma)
		historyRef.current[symbol] = nextData
		applyMinMaxLines(symbol, nextData)
	}, [applyMinMaxLines])

	const toggleCoinVisibility = useCallback((symbol: string) => {
		setUi((prev) => ({
			...prev,
			visibilityBySymbol: {
				...prev.visibilityBySymbol,
				[symbol]: !(prev.visibilityBySymbol[symbol] ?? true),
			},
		}))
	}, [])

	const selectCoin = useCallback((symbol: string) => {
		setUi((prev) => ({ ...prev, selectedSymbol: symbol }))
	}, [])

	useEffect(() => {
		window.addEventListener('tracked-symbols-updated', syncWatchedSymbols)
		window.addEventListener('storage', syncWatchedSymbols)

		return () => {
			window.removeEventListener('tracked-symbols-updated', syncWatchedSymbols)
			window.removeEventListener('storage', syncWatchedSymbols)
		}
	}, [syncWatchedSymbols])

	useEffect(() => {
		let mounted = true

		const fetchLogos = async () => {
			try {
				if (watchedSymbols.length === 0) {
					if (mounted) setLogoBySymbol({})
					return
				}

				const allCoins = await mainService.getCoins()
				if (!mounted) return

				const nextMap: Record<string, string> = {}
				for (const trackedSymbol of watchedSymbols) {
					const normalized = normalizeTrackedSymbol(trackedSymbol).toLowerCase()
					const matched = allCoins.find((coin) => coin.symbol.toLowerCase() === normalized)
					if (matched?.image) {
						nextMap[trackedSymbol] = matched.image
					}
				}

				setLogoBySymbol(nextMap)
			} catch {
				if (mounted) setLogoBySymbol({})
			}
		}

		void fetchLogos()

		return () => {
			mounted = false
		}
	}, [watchedSymbols])

	useEffect(() => {
		if (!chartContainerRef.current) return
		const initialWidth = chartContainerRef.current.clientWidth
		const initialHeight = Math.max(180, chartContainerRef.current.clientHeight)

		const chart = createChart(chartContainerRef.current, {
			width: initialWidth,
			height: initialHeight,
			layout: {
				textColor: '#d8e1ef',
				background: { type: ColorType.Solid, color: '#0c1526' },
			},
			grid: {
				vertLines: { color: 'rgba(99, 115, 137, 0.16)' },
				horzLines: { color: 'rgba(99, 115, 137, 0.16)' },
			},
			rightPriceScale: {
				borderColor: 'rgba(148, 163, 184, 0.45)',
			},
			crosshair: {
				mode: CrosshairMode.Normal,
				vertLine: {
					visible: true,
					labelVisible: true,
					width: 1,
					color: 'rgba(180, 195, 216, 0.42)',
					style: LineStyle.Solid,
				},
				horzLine: {
					visible: true,
					labelVisible: true,
					width: 1,
					color: 'rgba(180, 195, 216, 0.42)',
					style: LineStyle.Solid,
				},
			},
			timeScale: {
				borderColor: 'rgba(148, 163, 184, 0.45)',
				timeVisible: true,
				secondsVisible: false,
			},
		})

		chartRef.current = chart

		chart.subscribeCrosshairMove((param) => {
			if (!param.point || !param.time || !chartContainerRef.current) {
				setTooltip(null)
				return
			}

			const selected = selectedSymbolRef.current
			const fallbackSymbol = watchedSymbolsRef.current.find((symbol) => (uiRef.current.visibilityBySymbol[symbol] ?? true))
			const activeSymbol = (selected && (uiRef.current.visibilityBySymbol[selected] ?? true)) ? selected : fallbackSymbol
			if (!activeSymbol) {
				setTooltip(null)
				return
			}

			const activeSeries = seriesRef.current[activeSymbol]?.price
			if (!activeSeries) {
				setTooltip(null)
				return
			}

			const valueAtPoint = getValueAtCrosshair(param.seriesData.get(activeSeries))
			if (valueAtPoint == null) {
				setTooltip(null)
				return
			}

			const firstValue = historyRef.current[activeSymbol]?.[0]?.value ?? null
			const changePct = firstValue && firstValue !== 0 ? ((valueAtPoint - firstValue) / firstValue) * 100 : null

			const bounds = chartContainerRef.current.getBoundingClientRect()
			const x = Math.min(Math.max(param.point.x + 10, 8), bounds.width - 220)
			const y = Math.min(Math.max(param.point.y + 10, 8), bounds.height - 120)

			setTooltip({
				x,
				y,
				symbol: activeSymbol,
				price: valueAtPoint,
				time: formatChartTime(param.time),
				changePct,
			})
		})

		resizeObserverRef.current = new ResizeObserver((entries) => {
			const entry = entries[0]
			if (!entry || !chartRef.current) return

			const width = entry.contentRect.width
			const height = Math.max(180, entry.contentRect.height)
			if (width <= 0) return

			chartRef.current.applyOptions({
				width,
				height,
			})
		})

		resizeObserverRef.current.observe(chartContainerRef.current)

		return () => {
			resizeObserverRef.current?.disconnect()
			resizeObserverRef.current = null
			chart.remove()
			chartRef.current = null
			seriesRef.current = {}
			historyRef.current = {}
		}
	}, [])

	useEffect(() => {
		const chart = chartRef.current
		if (!chart) return

		Object.values(seriesRef.current).forEach((series) => {
			chart.removeSeries(series.price)
			chart.removeSeries(series.sma)
		})

		seriesRef.current = {}
		historyRef.current = {}

		watchedSymbols.forEach((symbol, index) => {
			const color = SERIES_COLORS[index % SERIES_COLORS.length]

			const priceSeries = chart.addSeries(AreaSeries, {
				lineColor: color,
				topColor: hexToRgba(color, 0.3),
				bottomColor: hexToRgba(color, 0.05),
				lineWidth: 2,
				title: symbol,
				priceLineVisible: false,
				lastValueVisible: true,
			})

			const smaSeries = chart.addSeries(LineSeries, {
				color: hexToRgba(color, 0.76),
				lineStyle: LineStyle.Dashed,
				lineWidth: 1,
				title: `${symbol} SMA(20)`,
				priceLineVisible: false,
				lastValueVisible: false,
			})

			seriesRef.current[symbol] = {
				price: priceSeries,
				sma: smaSeries,
				color,
			}

			historyRef.current[symbol] = []
		})
	}, [watchedSymbols])

	useEffect(() => {
		Object.entries(seriesRef.current).forEach(([symbol, series]) => {
			const visible = effectiveVisibility[symbol] ?? true
			series.price.applyOptions({ visible })
			series.sma.applyOptions({ visible })

			series.price.applyOptions({
				lineWidth: selectedSymbol === symbol ? 3 : 2,
			})

			applyMinMaxLines(symbol, historyRef.current[symbol] ?? [])
		})
	}, [applyMinMaxLines, effectiveVisibility, selectedSymbol])

	useEffect(() => {
		if (watchedSymbols.length === 0) {
			firstLoadRef.current = true
			return
		}

		let mounted = true

		const loadHistory = async () => {
			try {
				if (firstLoadRef.current) {
					setLoading(true)
				}

				const responses = await Promise.all(
					watchedSymbols.map(async (symbol) => {
						const data = await getJsonWithRetry<CryptoCompareHistoryResponse>(buildHistoryUrl(symbol))
						return { symbol, data }
					})
				)

				if (!mounted) return

				const nextRows: CoinRow[] = responses.map(({ symbol, data }) => {
					const points = data.Data?.Data ?? []

					const lineData: LineData[] = points
						.map((point) => ({
							time: (normalizeTime(point.time) / 1000) as UTCTimestamp,
							value: point.close,
						}))
						.filter((point) => Number.isFinite(point.value))
						.filter((point) => point.time * 1000 <= Date.now())
						.slice(-MAX_POINTS)

					patchSeriesData(symbol, lineData)

					const latestPrice = lineData[lineData.length - 1]?.value ?? null
					return {
						symbol,
						price: latestPrice,
						changePct24h: calculate24hChange(lineData),
					}
				})

				setRows(nextRows)
				setError('')
				setLoading(false)
				firstLoadRef.current = false
				chartRef.current?.timeScale().fitContent()
			} catch (requestError) {
				if (!mounted) return
				setError(formatApiError(requestError, 'Unable to load chart history right now. Please try again.'))
				setLoading(false)
				firstLoadRef.current = false
			}
		}

		const fetchLivePrices = async () => {
			try {
				const data = await getJsonWithRetry<LivePricesResponse>(buildLivePricesUrl(watchedSymbols))
				if (!mounted) return

				setRows((prev) => {
					const prevBySymbol = new Map(prev.map((row) => [row.symbol, row]))

					return watchedSymbols.map((symbol) => {
						const normalized = normalizeTrackedSymbol(symbol)
						const livePrice = data[normalized]?.USD
						const previousRow = prevBySymbol.get(symbol)
						const nextPrice = Number.isFinite(livePrice) ? (livePrice as number) : (previousRow?.price ?? null)

						if (nextPrice != null) {
							const previousData = historyRef.current[symbol] ?? []
							const nowSeconds = Math.floor(Date.now() / 1000) as UTCTimestamp
							let nextData = previousData

							if (previousData.length === 0) {
								nextData = [{ time: nowSeconds, value: nextPrice }]
							} else {
								const last = previousData[previousData.length - 1]
								if (last.time === nowSeconds) {
									nextData = [...previousData.slice(0, -1), { time: nowSeconds, value: nextPrice }]
								} else {
									nextData = [...previousData, { time: nowSeconds, value: nextPrice }].slice(-MAX_POINTS)
								}
							}

							patchSeriesData(symbol, nextData)
						}

						const latestHistory = historyRef.current[symbol] ?? []
						const latestValue = nextPrice ?? latestHistory[latestHistory.length - 1]?.value ?? null

						return {
							symbol,
							price: latestValue,
							changePct24h: calculate24hChange(latestHistory),
						}
					})
				})

				setError('')
				setLastUpdated(
					new Date().toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit',
					})
				)
			} catch (requestError) {
				if (!mounted) return
				setError(formatApiError(requestError, 'Unable to load live prices right now. Please try again.'))
			}
		}

		loadHistory().then(() => {
			if (!mounted) return
			fetchLivePrices()
		})

		const intervalId = setInterval(fetchLivePrices, LIVE_REFRESH_MS)

		return () => {
			mounted = false
			clearInterval(intervalId)
		}
	}, [patchSeriesData, watchedSymbols])

	const selectedRow = rows.find((row) => row.symbol === selectedSymbol)
	const displayRows = watchedSymbols.length === 0 ? [] : rows
	const showLoading = watchedSymbols.length > 0 && loading
	const showError = watchedSymbols.length > 0 ? error : ''

	return (
		<section className='Feed'>
			<header className='feed-header'>
				<h2>Crypto Command Center</h2>
				<p>
					30-day hourly history <span className='dot'>•</span> SMA(20) + Min/Max markers <span className='dot'>•</span> Updated:{' '}
					{lastUpdated || '--:--:--'}
				</p>
			</header>

			{watchedSymbols.length === 0 && <p className='status-message'>Track up to five coins in Home to display the dashboard.</p>}
			{showError && <p className='status-message error'>{showError}</p>}

			<div className='terminal-grid'>
				<aside className='watchlist-column'>
					<section className='panel watchlist-panel'>
						<header className='panel-header'>
							<h3>Watchlist</h3>
						</header>

						<section className='legend-panel'>
						{watchedSymbols.map((symbol) => {
							const row = rows.find((item) => item.symbol === symbol)
							const isSelected = symbol === selectedSymbol
							const isVisible = effectiveVisibility[symbol] ?? true

							return (
								<div
									key={symbol}
									className={`legend-item ${isSelected ? 'selected' : ''} ${isVisible ? '' : 'muted'}`}
									role='button'
									tabIndex={0}
									aria-pressed={isSelected}
									aria-label={`Select ${symbol}`}
									onClick={() => selectCoin(symbol)}
									onKeyDown={(event) => {
										if (event.key === 'Enter' || event.key === ' ') {
											event.preventDefault()
											selectCoin(symbol)
										}
									}}
								>
									<span className='legend-left'>
										{logoBySymbol[symbol] ? (
											<img className='legend-logo' src={logoBySymbol[symbol]} alt={normalizeTrackedSymbol(symbol)} />
										) : null}
										<span className='legend-symbol'>{symbol}</span>
									</span>

									<span className='legend-right'>
										<span className={row?.changePct24h != null && row.changePct24h < 0 ? 'delta neg' : 'delta pos'}>
											{row?.changePct24h == null ? '--' : `${row.changePct24h >= 0 ? '+' : ''}${row.changePct24h.toFixed(2)}%`}
										</span>
										<button
											type='button'
											role='switch'
											aria-checked={isVisible}
											aria-label={`Toggle ${symbol} visibility`}
											className={`legend-switch ${isVisible ? 'active' : ''}`}
											onClick={(event) => {
												event.stopPropagation()
												toggleCoinVisibility(symbol)
											}}
										/>
									</span>
								</div>
							)
						})}
					</section>
					</section>

					<section className='panel price-panel'>
						<header className='panel-header'>
							<h3>Price Table</h3>
						</header>
						<div className='price-table-head'>
							<span>Symbol</span>
							<span>Price</span>
							<span>Change %</span>
						</div>
						<section className='ohlc-panel'>
						{displayRows.map((row) => (
							<div key={row.symbol} className={row.symbol === selectedSymbol ? 'selected-row' : ''}>
								<span>{row.symbol}</span>
								<strong>{row.price != null ? `$${formatPrice(row.price)}` : 'N/A'}</strong>
								<span className={row.changePct24h !== null && row.changePct24h < 0 ? 'delta neg' : 'delta pos'}>
									{row.changePct24h == null ? '--' : `${row.changePct24h >= 0 ? '+' : ''}${row.changePct24h.toFixed(2)}%`}
								</span>
							</div>
						))}
					</section>
					</section>
				</aside>

				<div className='chart-column'>
					<div className='chart-shell'>
						{showLoading && (
							<div className='chart-project2'>
								<Spinner label='Loading chart data...' />
							</div>
						)}

						<div ref={chartContainerRef} className='candles-container' />

						{tooltip && (
							<div className='chart-tooltip' style={{ transform: `translate(${tooltip.x}px, ${tooltip.y}px)` }}>
								<strong>{tooltip.symbol}</strong>
								<span>{tooltip.time}</span>
								<span>${tooltip.price.toFixed(4)}</span>
								<span className={tooltip.changePct !== null && tooltip.changePct < 0 ? 'delta neg' : 'delta pos'}>
									{tooltip.changePct == null ? '--' : `${tooltip.changePct >= 0 ? '+' : ''}${tooltip.changePct.toFixed(2)}%`}
								</span>
							</div>
						)}

						{selectedRow && (
							<div className='selection-pill'>
								<span>{selectedSymbol}</span>
								<strong>{selectedRow.price != null ? `$${selectedRow.price.toFixed(2)}` : 'N/A'}</strong>
							</div>
						)}
					</div>
				</div>
			</div>
		</section>
	)
}
