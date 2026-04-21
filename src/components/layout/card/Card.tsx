import { useState } from 'react'
import './Card.css'
import MoreInfo from '../more-info/MoreInfo'

export type CoinCardItem = {
  id: string
  name: string
  symbol: string
  logo: string
}

type Props = {
  coin: CoinCardItem
  isTracked: boolean
  onToggleTrack: (coinId: string) => void
}

export default function Card({ coin, isTracked, onToggleTrack }: Props) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <>
      <article className='card'>
        <div className='coin-preview'>
          <img src={coin.logo} alt={coin.name} className='coin-logo' />
          <p className='coin-symbol'>{coin.symbol}</p>
          <p className='coin-name'>{coin.name}</p>
        </div>

        <div className='card-actions'>
          <button type='button' onClick={() => setShowDetails(true)}>
            More Info
          </button>

          <button
            type='button'
            className={`secondary ${isTracked ? 'active' : ''}`}
            role='switch'
            aria-checked={isTracked}
            aria-label={`Track ${coin.name}`}
            onClick={() => onToggleTrack(coin.id)}
          >
            <span className='visually-hidden'>{isTracked ? 'Tracking enabled' : 'Tracking disabled'}</span>
          </button>
        </div>
      </article>

      {showDetails && (
        <div className='modal-overlay' onClick={() => setShowDetails(false)}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <button className='close' onClick={() => setShowDetails(false)}>
              ✖
            </button>

            <MoreInfo coin={coin} />
          </div>
        </div>
      )}
    </>
  )
}