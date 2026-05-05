import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AiResult } from '../services/aiService'

export type RecommendationEntry = {
  coinName: string
  result: AiResult
}

export type RecommendationState = {
  apiKey: string
  selectedCoinId: string
  resultsByCoinId: Record<string, RecommendationEntry>
  isLoading: boolean
  error: string
}

const initialState: RecommendationState = {
  apiKey: '',
  selectedCoinId: '',
  resultsByCoinId: {},
  isLoading: false,
  error: '',
}

export const recommendationSlice = createSlice({
  name: 'recommendation',
  initialState,
  reducers: {
    setRecommendationApiKey: (state, action: PayloadAction<string>) => {
      state.apiKey = action.payload
    },
    setRecommendationSelectedCoin: (state, action: PayloadAction<string>) => {
      state.selectedCoinId = action.payload
    },
    setRecommendationResults: (
      state,
      action: PayloadAction<Record<string, RecommendationEntry>>
    ) => {
      state.resultsByCoinId = action.payload
    },
    setRecommendationLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setRecommendationError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
    resetRecommendation: () => initialState,
  },
})

export const {
  setRecommendationApiKey,
  setRecommendationSelectedCoin,
  setRecommendationResults,
  setRecommendationLoading,
  setRecommendationError,
  resetRecommendation,
} = recommendationSlice.actions
export const recommendationReducer = recommendationSlice.reducer
