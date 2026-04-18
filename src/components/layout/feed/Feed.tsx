import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import {
  createChart,
  ColorType,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from 'lightweight-charts'
import './Feed.css'

const TRACKED_COIN_SYMBOLS_KEY = 'trackedCoinSymbols'
const REFRESH_MS = 30_000
const HISTORY_DAYS = 30
const HOURS_LIMIT = HISTORY_DAYS * 24
const MAX_POINTS = HOURS_LIMIT

const SERIES_COLORS = ['#f59e0b', '#60a5fa', '#facc15', '#a78bfa', '#34d399', '#f87171', '#22c55e']
const LIVE_URL = import.meta.env.VITE_LIVE_SERVER_URL as string | undefined

type CoinRow = {
  symbol: string
  price: number | null
  changePct: number | null
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

function normalizeTrackedSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/USDT$/, '')
}

const normalizeTime = (t: number | string) => {
  if (typeof t === 'string') return new Date(t).getTime()

  if (t > 1e12) return t

  return t * 1000
}

function buildHistoryUrl(symbol: string): string {
  const fsym = normalizeTrackedSymbol(symbol)
  const defaultHistoryUrl = `https://min-api.cryptocompare.com/data/v2/histohour?fsym=${encodeURIComponent(fsym)}&tsym=USD&limit=${HOURS_LIMIT}&aggregate=1`

  if (!LIVE_URL || LIVE_URL.trim() === '') {
    return defaultHistoryUrl
  }

  if (LIVE_URL.includes('<symbols>')) {
    return LIVE_URL
      .replace('<symbols>', encodeURIComponent(fsym))
      .replace('/histominute', '/histohour')
      .replace('limit=120', `limit=${HOURS_LIMIT}`)
      .replace('aggregate=5', 'aggregate=1')
  }

  if (LIVE_URL.includes('<symbol>')) {
    return LIVE_URL
      .replace('<symbol>', encodeURIComponent(fsym))
      .replace('/histominute', '/histohour')
      .replace('limit=120', `limit=${HOURS_LIMIT}`)
      .replace('aggregate=5', 'aggregate=1')
  }

  if (LIVE_URL.includes('/data/pricemulti')) {
    return defaultHistoryUrl
  }

  try {
    const parsed = new URL(LIVE_URL)
    return `${parsed.origin}/data/v2/histohour?fsym=${encodeURIComponent(fsym)}&tsym=USD&limit=${HOURS_LIMIT}&aggregate=1`
  } catch {
    return defaultHistoryUrl
  }
}

function readTrackedSymbols(): string[] {
  try {
    const raw = localStorage.getItem(TRACKED_COIN_SYMBOLS_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.toUpperCase())
      .slice(0, 5)
  } catch {
    return []
  }
}

export default function Feed() {
  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<Record<string, ISeriesApi<'Line'>>>({})
  const historyRef = useRef<Record<string, LineData[]>>({})

  const [watchedSymbols, setWatchedSymbols] = useState<string[]>(() =>
    readTrackedSymbols()
  )

  const [rows, setRows] = useState<CoinRow[]>([])
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  // sync storage
  useEffect(() => {
    const sync = () => setWatchedSymbols(readTrackedSymbols())

    window.addEventListener('tracked-symbols-updated', sync)
    window.addEventListener('storage', sync)

    return () => {
      window.removeEventListener('tracked-symbols-updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  // chart init
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      height: 500,
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
      },
    })

    chartRef.current = chart

    return () => {
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
      chart.removeSeries(series)
    })

    seriesRef.current = {}
    historyRef.current = {}

    watchedSymbols.forEach((symbol, index) => {
      const series = chart.addSeries(LineSeries, {
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        lineWidth: 2,
        title: symbol.replace('USDT', ''),
        priceLineVisible: false,
        lastValueVisible: true,
      })

      seriesRef.current[symbol] = series
      historyRef.current[symbol] = []
    })
  }, [watchedSymbols])

  // fetch historical lines for each tracked coin
  useEffect(() => {
    if (watchedSymbols.length === 0) {
      return
    }

    let isMounted = true

    const fetchData = async () => {
      try {
        const responses = await Promise.all(
          watchedSymbols.map(async (symbol) => {
            const url = buildHistoryUrl(symbol)
            const { data } = await axios.get<CryptoCompareHistoryResponse>(url)
            return { symbol, data }
          })
        )

        if (!isMounted) return

        const formatted: CoinRow[] = responses.map(({ symbol, data }) => {
          if (data.Response && data.Response !== 'Success') {
            seriesRef.current[symbol]?.setData([])
            return {
              symbol,
              price: null,
              changePct: null,
            }
          }

          const points = data.Data?.Data

          const cleanedData = (points ?? [])
            .map((item) => ({
              ...item,
              time: normalizeTime(item.time),
            }))
            .filter((item) => item.time <= Date.now())
            .filter((item) => Number.isFinite(item.close))

          const lineData = cleanedData
            .map((p) => ({
              time: (p.time / 1000) as UTCTimestamp,
              value: p.close,
            }))
            .slice(-MAX_POINTS)

          const safeLineData = lineData.filter(
            (p) => p.time * 1000 <= Date.now()
          )

          seriesRef.current[symbol]?.setData(safeLineData)

          const last = safeLineData[safeLineData.length - 1]?.value ?? null
          const prev = safeLineData[safeLineData.length - 2]?.value ?? null

          let changePct: number | null = null
          if (last !== null && prev !== null && prev !== 0) {
            changePct = ((last - prev) / prev) * 100
          }

          return {
            symbol,
            price: last,
            changePct,
          }
        })

        setRows(formatted)
        setError('')

        chartRef.current?.timeScale().fitContent()

        setLastUpdated(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )
      } catch {
        setError('Failed to fetch history data from VITE_LIVE_SERVER_URL')
      }
    }

    fetchData()

    const id = setInterval(fetchData, REFRESH_MS)

    return () => {
      isMounted = false
      clearInterval(id)
    }
  }, [watchedSymbols])

  const displayRows = watchedSymbols.length === 0 ? [] : rows

  return (
    <section className='Feed'>
      <header className='feed-header'>
        <h2>Live Crypto Feed (Tracked Coins)</h2>
        <p>
          Source: VITE_LIVE_SERVER_URL <span className='dot'>•</span> 30-day history window <span className='dot'>•</span> Last update: {lastUpdated || '--:--:--'}
        </p>
      </header>

      {watchedSymbols.length === 0 && <p className='status-message'>Track coins in Home to watch them here.</p>}

      {error && <p className='status-message error'>{error}</p>}

      <section className='ohlc-panel'>
        {displayRows.map((r) => (
          <div key={r.symbol}>
            <span>{r.symbol}</span>
            <strong>
              {r.price != null ? r.price.toFixed(2) : 'N/A'}
            </strong>
            <span className={r.changePct !== null && r.changePct < 0 ? 'delta neg' : 'delta pos'}>
              {r.changePct === null ? '--' : `${r.changePct >= 0 ? '+' : ''}${r.changePct.toFixed(2)}%`}
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