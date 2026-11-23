import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { Action } from "@reduxjs/toolkit";
import { apiRequest } from "../../libs/apiConfig";
import type { RootState } from "../../redux/store";
import type { ListState } from "../../redux/slices/listSlice";

type ListActions<T> = {
  fetchDataStart: () => Action;
  fetchDataSuccess: (data: T[]) => Action;
  fetchDataFailure: (error: string) => Action;
  upsertOne: (item: T) => Action;
  removeOne: (id: number | string) => Action;
};

/** Requests already on their way, so five components asking at once make one call. */
const inFlight = new Map<string, Promise<void>>();

/** Lists younger than this are reused when a screen opens; refresh() always reloads. */
const FRESH_MS = 60_000;

/**
 * Shared loader for list screens: loads once, reuses the list across screens,
 * and offers upsert/remove so saves show immediately.
 */
export const useListResource = <T extends { id: number | string }>(
  endpoint: string,
  select: (state: RootState) => ListState<T>,
  actions: ListActions<T>,
) => {
  const dispatch = useDispatch();
  const state = useSelector(select);

  const load = useCallback(
    async () => {
      const running = inFlight.get(endpoint);
      if (running) return running;
      const task = (async () => {
        dispatch(actions.fetchDataStart());
        try {
          const response = await apiRequest<{ data?: T[] }>(endpoint, "GET");
          dispatch(actions.fetchDataSuccess(Array.isArray(response?.data) ? response.data : []));
        } catch (error) {
          dispatch(actions.fetchDataFailure(error instanceof Error ? error.message : "Could not load the list"));
        } finally {
          inFlight.delete(endpoint);
        }
      })();
      inFlight.set(endpoint, task);
      return task;
    },
    [dispatch, endpoint, actions],
  );

  useEffect(() => {
    const stale = !state.loadedAt || Date.now() - state.loadedAt > FRESH_MS;
    if (stale && !state.loading) void load();
    // only on mount: later loads are explicit (refresh) or in-place updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upsert = useCallback((item: T) => dispatch(actions.upsertOne(item)), [dispatch, actions]);
  const remove = useCallback((id: number | string) => dispatch(actions.removeOne(id)), [dispatch, actions]);
  const refresh = useCallback(() => load(), [load]);

  return { ...state, refresh, upsert, remove };
};
