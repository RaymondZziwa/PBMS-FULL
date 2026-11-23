import * as actions from "../../redux/slices/settings/roleSlice";
import { RoleEndpoints } from "../../endpoints/settings/role/roleEndpoints";
import type { IRole } from "../../redux/types/systemSettings";
import type { RootState } from "../../redux/store";
import { useListResource } from "../humanResource/useListResource";

const select = (state: RootState) => state.role;

/** Roles with their permissions and holders; upsert/remove update every screen at once. */
const useRoles = () => useListResource<IRole>(RoleEndpoints.getAllRoles, select, actions);

export default useRoles;
