import * as actions from "../../redux/slices/settings/permissionSlice";
import { RoleEndpoints } from "../../endpoints/settings/role/roleEndpoints";
import type { IPermissionGroup } from "../../redux/types/systemSettings";
import type { RootState } from "../../redux/store";
import { useListResource } from "../humanResource/useListResource";

const select = (state: RootState) => state.permission;

/** All permissions grouped by module (the API's groups get their module name as id). */
const usePermissions = () => {
  const res = useListResource<IPermissionGroup>(RoleEndpoints.getAllPermissions, select, actions);
  const data = (res.data ?? []).map((g) => ({ ...g, id: g.id ?? g.module }));
  return { ...res, data };
};

export default usePermissions;
