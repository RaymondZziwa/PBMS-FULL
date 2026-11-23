import * as actions from "../../redux/slices/settings/branchSlice";
import { branchEndpoints } from "../../endpoints/settings/branch/branchEndpoints";
import type { IBranch } from "../../redux/types/systemSettings";
import type { RootState } from "../../redux/store";
import { useListResource } from "../humanResource/useListResource";

const select = (state: RootState) => state.branch;

/** Branches, loaded once and shared; upsert/remove update every screen at once. */
const useBranches = () => useListResource<IBranch>(branchEndpoints.getBranches, select, actions);

export default useBranches;
