import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * A list kept in the store, plus in-place updates so a save or delete shows
 * at once without downloading the whole list again.
 */
export type ListState<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
  /** When the list was last loaded from the server (ms). */
  loadedAt: number | null;
};

export const makeListSlice = <T extends { id: number | string }>(name: string) => {
  const initialState: ListState<T> = { data: [], loading: false, error: null, loadedAt: null };
  return createSlice({
    name,
    initialState: initialState as ListState<T>,
    reducers: {
      fetchDataStart(state) {
        state.loading = true;
        state.error = null;
      },
      fetchDataSuccess(state, action: PayloadAction<T[]>) {
        state.loading = false;
        state.data = action.payload as typeof state.data;
        state.error = null;
        state.loadedAt = Date.now();
      },
      fetchDataFailure(state, action: PayloadAction<string>) {
        state.loading = false;
        state.error = action.payload;
      },
      /** Add a new record at the top, or replace the one with the same id. */
      upsertOne(state, action: PayloadAction<T>) {
        const i = state.data.findIndex((x) => String(x.id) === String(action.payload.id));
        if (i >= 0) state.data[i] = action.payload as (typeof state.data)[number];
        else state.data.unshift(action.payload as (typeof state.data)[number]);
      },
      removeOne(state, action: PayloadAction<number | string>) {
        state.data = state.data.filter((x) => String(x.id) !== String(action.payload));
      },
    },
  });
};
