import { makeListSlice } from "../listSlice";
import type { IPermissionGroup } from "../../types/systemSettings";

const permissionSlice = makeListSlice<IPermissionGroup>("permission");

export const { fetchDataStart, fetchDataSuccess, fetchDataFailure, upsertOne, removeOne } = permissionSlice.actions;
export default permissionSlice.reducer;
