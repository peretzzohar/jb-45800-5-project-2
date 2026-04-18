import type { CoinCardItem } from '../../layout/card/Card'
import './TrackLimitModal.css'

type TrackLimitModalProps = {
  isOpen: boolean
  trackedCoins: CoinCardItem[]
  selectedCoinIds: string[]
  pendingCoinName?: string
  onToggleCoin: (coinId: string) => void
  onConfirm: () => void
  onClose: () => void
}

export default function TrackLimitModal({
  isOpen,
  trackedCoins,
  selectedCoinIds,
  pendingCoinName,
  onToggleCoin,
  onConfirm,
  onClose,
}: TrackLimitModalProps) {
  if (!isOpen) return null

  return (
    <div className='track-limit-overlay' onClick={onClose}>
      <div className='track-limit-modal' onClick={(event) => event.stopPropagation()}>
        <h3>Maximum Coins Reached</h3>
        <p>
          You can track up to 5 coins.
          {pendingCoinName ? ` To add ${pendingCoinName},` : ''} select one or more tracked coins to remove,
          then confirm.
        </p>

        <ul className='track-limit-list'>
          {trackedCoins.map((coin) => (
            <li key={coin.id}>
              <label>
                <input
                  type='checkbox'
                  checked={selectedCoinIds.includes(coin.id)}
                  onChange={() => onToggleCoin(coin.id)}
                />
                {coin.symbol.toUpperCase()} - {coin.name}
              </label>
            </li>
          ))}
        </ul>

        <div className='track-limit-actions'>
          <button
            type='button'
            onClick={onConfirm}
            disabled={selectedCoinIds.length === 0}
          >
            Confirm
          </button>

          <button type='button' className='secondary' onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
