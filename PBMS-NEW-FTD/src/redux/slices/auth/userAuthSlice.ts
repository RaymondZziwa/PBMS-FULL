import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { DataState } from "../generic";
import type { IUserAuth } from "../../types/userAuth";

const initialState: DataState<IUserAuth> = {
  data: {
      id: "",
      firstName: "",
      lastName: "",
      gender: "",
      hasAccess: false,
      isActive: false,
      updatedAt: "",
        createdAt: "",
      
      branch: {
          id: "",
          name: ""
      },
      department: {
          id: "",
          name: ""
      },
      token: {
          accessToken: "",
          refreshToken: ""
        },
        role: {
            id: "",
            name: "",
            permissions: []
      }
  },
  loading: false,
  error: null,
};

const userAuthSlice = createSlice({
  name: "userAuth",
  initialState,
  reducers: {
    fetchDataStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchDataSuccess(state, action: PayloadAction<IUserAuth>) {
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
userAuthSlice.actions;
export default userAuthSlice.reducer;
