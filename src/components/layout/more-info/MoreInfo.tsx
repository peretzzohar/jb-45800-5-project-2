import { useEffect, useState } from 'react'
import './MoreInfo.css'
import type { CoinCardItem } from '../card/Card'
import currencyService from '../../../services/currencyService'
import type { Coin } from '../../../services/mainService'

type Props = {
  coin: CoinCardItem
}

type MultiCoins = {
  usd?: Coin
  eur?: Coin
  ils?: Coin
}

export default function MoreInfo({ coin }: Props) {
  const [data, setData] = useState<MultiCoins>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError('')

        const res = await currencyService.getCoinsAll()

        const findCoin = (list: Coin[]) =>
          list.find(c => c.id.toLowerCase() === coin.id.toLowerCase())

        setData({
          usd: findCoin(res.usd),
          eur: findCoin(res.eur),
          ils: findCoin(res.ils),
        })

      } catch {
        setError('Failed to load coin info.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [coin.id])

  if (isLoading) {
    return <section className='more-info'>Loading coin info...</section>
  }

  if (error) {
    return <section className='more-info error'>{error}</section>
  }

  const { usd, eur, ils } = data

  if (!usd && !eur && !ils) {
    return <section className='more-info'>No coin info available.</section>
  }

  return (
    <section className='more-info'>
      <header className='more-info-header'>
        <img src={usd?.image || eur?.image || ils?.image} alt={coin.name} className='more-info-logo' />
        <div>
          <h2>{coin.name}</h2>
          <p className='symbol'>{coin.symbol.toUpperCase()}</p>
        </div>
      </header>

      <dl className='more-info-grid'>
        {usd && (
          <div>
            <dt>USD </dt>
            <dd>$ {usd.current_price.toLocaleString()}</dd>
          </div>
        )}

        {eur && (
          <div>
            <dt>EUR</dt>
            <dd>€ {eur.current_price.toLocaleString()}</dd>
          </div>
        )}

        {ils && (
          <div>
            <dt>ILS </dt>
            <dd>₪ {ils.current_price.toLocaleString()}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}