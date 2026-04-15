import './Card.css'

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
  return (
    <article className='card'>
      <div className='coin-preview'>
        <img src={coin.logo} alt={coin.name} className='coin-logo' />
        <p className='coin-symbol'>{coin.symbol}</p>
        <p className='coin-name'>{coin.name}</p>
      </div>

      <div className='card-actions'>
        <button type='button' onClick={() => alert(`${coin.name} details`)}>
          Details
        </button>
        <button type='button' className='secondary' onClick={() => alert(`Tracking ${coin.name}`)}>
          Track
        </button>
      </div>
    </article>
  )
}