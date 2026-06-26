import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { DataState } from "../generic";
import type { IClientAccount } from "../../types/finance";

const initialState: DataState<IClientAccount[]> = {
  data: [],
  loading: false,
  error: null,
};

const clientAccountSlice = createSlice({
  name: "clientAccount",
  initialState,
  reducers: {
    fetchDataStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchDataSuccess(state, action: PayloadAction<IClientAccount[]>) {
      state.loading = false;
      state.data = action.payload;
      state.error = null;
    },
    fetchDataFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure } =
clientAccountSlice.actions;
export default clientAccountSlice.reducer;
