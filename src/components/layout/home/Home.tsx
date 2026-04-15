import { useEffect, useState } from 'react'
import type { CoinCardItem } from '../card/Card'
import Card from '../card/Card'
import mainService from '../../../services/mainService'
import './Home.css'

export default function Home() {
  const [coins, setCoins] = useState<CoinCardItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <div className='Body'>
      <h2>Top 100 Coins</h2>

      {isLoading && <p>Loading coins...</p>}
      {error && <p>{error}</p>}

      {!isLoading && !error && (
        <section className='cards-grid'>
          {coins.map((coin) => (
            <Card key={coin.id} coin={coin} />
          ))}
        </section>
      )}
    </div>
  )
}