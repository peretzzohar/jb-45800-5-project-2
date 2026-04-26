import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type UiState = {
  searchTerm: string
}

const initialState: UiState = {
  searchTerm: '',
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload
    },
    resetUi: (state) => {
      state.searchTerm = ''
    },
  },
})

export const { setSearchTerm, resetUi } = uiSlice.actions
export const uiReducer = uiSlice.reducer
