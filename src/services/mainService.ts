import axios from 'axios'

export type Coin = {
    id: string
    name: string
    symbol: string
    image: string
    current_price: number
}

export type coinResponse = Coin[]

class MainService {

    async getCoins(name?: string, symbol?: string): Promise<coinResponse> {
        const { data } = await axios.get<Coin[]>(
            'https://api.coingecko.com/api/v3/coins/markets',
            {
                params: {
                    vs_currency: 'usd',
                }
            }
        )

        let filtered = data

        if (name) {
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(name.toLowerCase())
            )
        }

        if (symbol) {
            filtered = filtered.filter(c =>
                c.symbol.toLowerCase().includes(symbol.toLowerCase())
            )
        }

        return filtered
    }
}

export default new MainService()