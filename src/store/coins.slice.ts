import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CoinCardItem } from '../components/layout/card/Card'

export type CoinsState = {
  coins: CoinCardItem[]
  isLoading: boolean
  error: string
}

const initialState: CoinsState = {
  coins: [],
  isLoading: false,
  error: '',
}

export const coinsSlice = createSlice({
  name: 'coins',
  initialState,
  reducers: {
    setCoins: (state, action: PayloadAction<CoinCardItem[]>) => {
      state.coins = action.payload
    },
    setCoinsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setCoinsError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
    resetCoins: () => initialState,
  },
})

export const { setCoins, setCoinsLoading, setCoinsError, resetCoins } = coinsSlice.actions
export const coinsReducer = coinsSlice.reducer
