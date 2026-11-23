import type { IPermission, IRole } from "../../../redux/types/systemSettings";

/** Permission values from a role (objects from the API, or strings from old sessions). */
export const roleValues = (role?: Pick<IRole, "permissions"> | null): string[] =>
  (role?.permissions ?? []).map((p) => (typeof p === "string" ? p : p.value)).filter(Boolean);

/** Holding either of these lets someone grant themselves anything (full access). */
export const FULL_ACCESS_VALUES = ["create_and_modify_roles", "assign_permissions"];

/** "humanResource" / "HUMAN_RESOURCE" / "human resource" → "Human resource". */
export const moduleLabel = (m: string) => {
  const s = m.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().toLowerCase();
  return s ? s[0].toUpperCase() + s.slice(1) : "Other";
};

export const permLabel = (p: IPermission) => p.name || p.value.replace(/_/g, " ");
