import axios from 'axios'

type Coin = {
  id: string
  name: string
  symbol: string
  image: string
  current_price: number
}

type MultiCurrencyResponse = {
  usd: Coin[]
  eur: Coin[]
  ils: Coin[]
}

const BASE_URL = import.meta.env.VITE_SERVER_URL_CURRENCY

class CurrencyService {

  async getCoinsAll(): Promise<MultiCurrencyResponse> {
    const [usd, eur, ils] = await Promise.all([
      axios.get<Coin[]>(BASE_URL, {
        params: { vs_currency: 'usd' }
      }),
      axios.get<Coin[]>(BASE_URL, {
        params: { vs_currency: 'eur' }
      }),
      axios.get<Coin[]>(BASE_URL, {
        params: { vs_currency: 'ils' }
      })
    ])

    return {
      usd: usd.data,
      eur: eur.data,
      ils: ils.data
    }
  }
}

export default new CurrencyService()