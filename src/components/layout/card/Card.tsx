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
}

export default function Card({ coin }: Props) {
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

          <button type='button' className='secondary'>
            Track
          </button>
        </div>
      </article>

      {/* POPUP */}
      {showDetails && (
        <div className='modal-overlay' onClick={() => setShowDetails(false)}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <button className='close' onClick={() => setShowDetails(false)}>
              ✖
            </button>

            <MoreInfo />
          </div>
        </div>
      )}
    </>
  )
}