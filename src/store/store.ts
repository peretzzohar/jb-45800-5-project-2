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
import { coinsReducer, resetCoins, setCoins, setCoinsError, setCoinsLoading } from './coins.slice'
import {
  recommendationReducer,
  resetRecommendation,
  setRecommendationError,
  setRecommendationLoading,
  setRecommendationResults,
  setRecommendationSelectedCoin,
} from './recommendation.slice'

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
  setCoins,
  setCoinsLoading,
  setCoinsError,
  resetCoins,
  setRecommendationSelectedCoin,
  setRecommendationResults,
  setRecommendationLoading,
  setRecommendationError,
  resetRecommendation,
}

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    market: marketReducer,
    ui: uiReducer,
    coins: coinsReducer,
    recommendation: recommendationReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
