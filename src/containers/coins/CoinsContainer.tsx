import { useEffect, useState } from 'react'
import type { CoinCardItem } from '../../components/layout/card/Card'
import Card from '../../components/layout/card/Card'
import mainService from '../../services/mainService'

export default function CoinsContainer() {
  const [coins, setCoins] = useState<CoinCardItem[]>([])

  useEffect(() => {
    async function fetchCoins() {
      const data = await mainService.getCoins()

      const mapped: CoinCardItem[] = data.map(c => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        logo: c.image
      }))

      setCoins(mapped)
    }

    fetchCoins()
  }, [])

  return (
    <div>
      {coins.map((coin) => (
        <Card key={coin.id} coin={coin} />
      ))}
    </div>
  )
}