import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'

type MarketState = {
  trackedCoinIds: string[]
  trackedCoinSymbols: string[]
  selectedSymbol: string
}

type UiState = {
  searchTerm: string
}


const initialMarketState: MarketState = {
  trackedCoinIds: [],
  trackedCoinSymbols: [],
  selectedSymbol: '',
}

const marketSlice = createSlice({
  name: 'market',
  initialState: initialMarketState,
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
    resetMarket: () => initialMarketState,
  },
})

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    searchTerm: '',
  } as UiState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload
    },
    resetUi: (state) => {
      state.searchTerm = ''
    },
  },
})

export const {
  setTrackedCoinIds,
  setTrackedCoinSymbols,
  setSelectedSymbol,
  resetMarket,
} = marketSlice.actions


export const { setSearchTerm, resetUi } = uiSlice.actions

export const store = configureStore({
  reducer: {
    market: marketSlice.reducer,
    ui: uiSlice.reducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
