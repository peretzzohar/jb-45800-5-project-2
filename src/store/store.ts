import { configureStore } from '@reduxjs/toolkit'
import { counterReducer, decrement, increment, reset } from './counter.slice'
import {
  marketReducer,
  resetMarket,
  setSelectedSymbol,
  setTrackedCoinIds,
  setTrackedCoinSymbols,
} from './market.slice'
import { resetUi, setSearchTerm, uiReducer } from './ui.slice'

export {
  increment,
  decrement,
  reset,
  setTrackedCoinIds,
  setTrackedCoinSymbols,
  setSelectedSymbol,
  resetMarket,
  setSearchTerm,
  resetUi,
}

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    market: marketReducer,
    ui: uiReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
