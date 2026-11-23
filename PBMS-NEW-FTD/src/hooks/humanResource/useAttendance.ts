import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDataStart, fetchDataSuccess, fetchDataFailure } from "../../redux/slices/humanResource/attendanceSlice";
import { apiRequest } from "../../libs/apiConfig";
import type { RootState } from "../../redux/store";
import { PayrollEndpoints } from "../../endpoints/humanResource/payroll";

/** Today's date (YYYY-MM-DD) on this computer's clock, not UTC. */
export const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Attendance records for one day. `refresh()` reloads that same day. */
const useAttendance = (date: string = localToday()) => {
  const dispatch = useDispatch();

  const refresh = useCallback(async () => {
    dispatch(fetchDataStart());
    try {
      const response = await apiRequest<{ status: number; data: { attendances: unknown[] } }>(PayrollEndpoints.Attendance.get_attendance(date), "GET");
      dispatch(fetchDataSuccess(response.data.attendances));
    } catch (error) {
      dispatch(fetchDataFailure(error instanceof Error ? error.message : "Couldn't load attendance"));
    }
  }, [date, dispatch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const data = useSelector((state: RootState) => state.attendance);
  return { ...data, refresh };
};

export default useAttendance;
