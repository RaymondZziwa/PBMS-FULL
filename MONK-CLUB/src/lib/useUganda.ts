import { useMemo } from "react";
import { ugandaDistricts } from "../data/uganda";

/** Uganda districts, and the counties / sub-counties of the chosen district (built into the app). */
export const useUganda = (district: string, enabled: boolean) => {
  const all = useMemo(() => (enabled ? ugandaDistricts() : []), [enabled]);
  const districts = useMemo(() => all.map((d) => d.name), [all]);
  const counties = useMemo(() => all.find((d) => d.name === district)?.counties ?? [], [all, district]);
  return { districts, counties, detailed: true, loadingCounties: false };
};
