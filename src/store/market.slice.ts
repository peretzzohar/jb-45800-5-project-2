import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type MarketState = {
  trackedCoinIds: string[]
  trackedCoinSymbols: string[]
  selectedSymbol: string
}

const initialState: MarketState = {
  trackedCoinIds: [],
  trackedCoinSymbols: [],
  selectedSymbol: '',
}

export const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    setTrackedCoinIds: (state, action: PayloadAction<string[]>) => {
      state.trackedCoinIds = action.payload
    },
    setTrackedCoinSymbols: (state, action: PayloadAction<string[]>) => {
      state.trackedCoinSymbols = action.payload
    },
    setSelectedSymbol: (state, action: PayloadAction<string>) => {
      state.selectedSymbol = action.payload
    },
    resetMarket: () => initialState,
  },
})

export const {
  setTrackedCoinIds,
  setTrackedCoinSymbols,
  setSelectedSymbol,
  resetMarket,
} = marketSlice.actions
export const marketReducer = marketSlice.reducer
