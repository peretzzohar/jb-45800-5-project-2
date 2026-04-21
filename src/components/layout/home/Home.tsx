import { useEffect, useState } from 'react'
import type { CoinCardItem } from '../card/Card'
import Card from '../card/Card'
import mainService from '../../../services/mainService'
import './Home.css'

const TRACKED_COIN_IDS_KEY = 'trackedCoinIds'
const TRACKED_COIN_SYMBOLS_KEY = 'trackedCoinSymbols'

function getSavedTrackedCoinIds(): string[] {
  try {
    const raw = localStorage.getItem(TRACKED_COIN_IDS_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

type HomeProps = {
  searchTerm: string
}

export default function Home({ searchTerm }: HomeProps) {
  const [coins, setCoins] = useState<CoinCardItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [trackedCoinIds, setTrackedCoinIds] = useState<string[]>(() => getSavedTrackedCoinIds())
  const [showTrackLimitModal, setShowTrackLimitModal] = useState(false)
  const [pendingCoinId, setPendingCoinId] = useState<string | null>(null)
  const [coinsToRemoveIds, setCoinsToRemoveIds] = useState<string[]>([])

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredCoins = coins.filter((coin) => {
    if (!normalizedSearch) return true

    return (
      coin.name.toLowerCase().includes(normalizedSearch) ||
      coin.symbol.toLowerCase().includes(normalizedSearch)
    )
  })

  const trackedCoins = coins.filter((coin) => trackedCoinIds.includes(coin.id))

  const closeTrackLimitModal = () => {
    setShowTrackLimitModal(false)
    setPendingCoinId(null)
    setCoinsToRemoveIds([])
  }

  const handleToggleTrack = (coinId: string) => {
    setTrackedCoinIds((prev) => {
      if (prev.includes(coinId)) {
        return prev.filter((id) => id !== coinId)
      }

      if (prev.length >= 5) {
        setPendingCoinId(coinId)
        setShowTrackLimitModal(true)
        setCoinsToRemoveIds([])
        return prev
      }

      return [...prev, coinId]
    })
  }

  const handleToggleRemoveCoin = (coinId: string) => {
    setCoinsToRemoveIds((prev) =>
      prev.includes(coinId)
        ? prev.filter((id) => id !== coinId)
        : [...prev, coinId]
    )
  }

  const handleConfirmReplace = () => {
    if (coinsToRemoveIds.length === 0) return

    setTrackedCoinIds((prev) => {
      const next = prev.filter((id) => !coinsToRemoveIds.includes(id))

      if (pendingCoinId && !next.includes(pendingCoinId) && next.length < 5) {
        return [...next, pendingCoinId]
      }

      return next
    })

    closeTrackLimitModal()
  }

  useEffect(() => {
    async function fetchCoins() {
      try {
        setIsLoading(true)
        setError('')

        const data = await mainService.getCoins()

        const mapped = data.map((c) => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        logo: c.image
        }))

        const uniqueCoins = Array.from(
          new Map(mapped.map((coin) => [coin.id, coin])).values()
        )

        setCoins(uniqueCoins.slice(0, 100))
      } catch {
        setError('Failed to load coins.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCoins()
  }, [])

  useEffect(() => {
    localStorage.setItem(TRACKED_COIN_IDS_KEY, JSON.stringify(trackedCoinIds))

    const trackedSymbols = coins
      .filter((coin) => trackedCoinIds.includes(coin.id))
      .map((coin) => `${coin.symbol.toUpperCase()}USDT`)

    localStorage.setItem(TRACKED_COIN_SYMBOLS_KEY, JSON.stringify(trackedSymbols))
    window.dispatchEvent(new Event('tracked-symbols-updated'))
  }, [coins, trackedCoinIds])

  return (
    <div className='Body'>

      {isLoading && <p>Loading coins...</p>}
      {error && <p>{error}</p>}

      {!isLoading && !error && (
        <>
          <p>
            Tracking: {trackedCoinIds.length}/5
          </p>

          <section className='cards-grid'>
          {filteredCoins.map((coin) => (
            <Card
              key={coin.id}
              coin={coin}
              isTracked={trackedCoinIds.includes(coin.id)}
              onToggleTrack={handleToggleTrack}
            />
          ))}
          </section>
        </>
      )}

      {!isLoading && !error && filteredCoins.length === 0 && (
        <p>No currencies match "{searchTerm}".</p>
      )}

      {showTrackLimitModal && (
        <div className='track-limit-overlay' onClick={closeTrackLimitModal}>
          <div className='track-limit-modal' onClick={(event) => event.stopPropagation()}>
            <h3>Maximum Coins Reached</h3>
            <p>
              You can track up to 5 coins. Select one or more tracked coins to remove,
              then confirm to track another coin.
            </p>

            <ul className='track-limit-list'>
              {trackedCoins.map((coin) => (
                <li key={coin.id}>
                  <label>
                    <input
                      type='checkbox'
                      checked={coinsToRemoveIds.includes(coin.id)}
                      onChange={() => handleToggleRemoveCoin(coin.id)}
                    />
                    {coin.symbol.toUpperCase()} - {coin.name}
                  </label>
                </li>
              ))}
            </ul>

            <div className='track-limit-actions'>
              <button
                type='button'
                onClick={handleConfirmReplace}
                disabled={coinsToRemoveIds.length === 0}
              >
                Confirm
              </button>

              <button type='button' className='secondary' onClick={closeTrackLimitModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}