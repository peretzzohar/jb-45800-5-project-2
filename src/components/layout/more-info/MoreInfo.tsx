import { useEffect, useMemo, useState } from 'react'
import mainService, { type Coin } from '../../../services/mainService'
import './MoreInfo.css'

export default function MoreInfo() {
	const [coins, setCoins] = useState<Coin[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		async function fetchCoinDetails() {
			try {
				setIsLoading(true)
				setError('')

				const data = await mainService.getCoins()
				setCoins(data)
			} catch {
				setError('Failed to load coin info from service.')
			} finally {
				setIsLoading(false)
			}
		}

		fetchCoinDetails()
	}, [])

	const currentCoin = useMemo(() => {
		if (coins.length === 0) {
			return null
		}

		const selectedId = localStorage.getItem('selectedCoin')?.toLowerCase()
		if (!selectedId) {
			return coins[0]
		}

		return coins.find((coin) => coin.id.toLowerCase() === selectedId) ?? coins[0]
	}, [coins])

	if (isLoading) {
		return <section className='more-info'>Loading coin info...</section>
	}

	if (error) {
		return <section className='more-info error'>{error}</section>
	}

	if (!currentCoin) {
		return <section className='more-info'>No coin info available.</section>
	}

	return (
		<section className='more-info'>
			<header className='more-info-header'>
				<img src={currentCoin.image} alt={currentCoin.name} className='more-info-logo' />
				<div>
					<h2>{currentCoin.name}</h2>
					<p className='symbol'>{currentCoin.symbol.toUpperCase()}</p>
				</div>
			</header>

			<dl className='more-info-grid'>
				<div>
					<dt>ID</dt>
					<dd>{currentCoin.id}</dd>
				</div>
				<div>
					<dt>Current Price</dt>
					<dd>${currentCoin.current_price.toLocaleString()}</dd>
				</div>
			</dl>
		</section>
	)
}

