import { useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { fetchDataStart, fetchDataSuccess, fetchDataFailure } from "../../redux/slices/humanResource/attendanceSlice";
import { apiRequest } from "../../libs/apiConfig";
import type { RootState } from "../../redux/store";
import { PayrollEndpoints } from "../../endpoints/humanResource/payroll";

const useAttendance = (date?: string) => {
  const dispatch = useDispatch();
  //const { token, isFetchingLocalToken } = useAuth();

  const fetchDataFromApi = async (date?: string) => {
    //if (isFetchingLocalToken || !token?.access_token) return;
      let param;
      dispatch(fetchDataStart());
      if (!date) {
          param = new Date().toISOString()
      } else {
          param = date;
      }

    try {
      const response = await apiRequest(
          PayrollEndpoints.Attendance.get_attendance(param),
          "GET",
            '',
      );
      //console.log(response)
      if (response.status == 200) {
        dispatch(fetchDataSuccess(response.data.attendances)); // Dispatch action with fetched data
      } else {
        throw new Error("Failed to fetch attendance.");
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      dispatch(
        fetchDataFailure(
          error instanceof Error ? error.message : "An unknown error occurred."
        )
      );
    }
  };

  useEffect(()=> {
    fetchDataFromApi(date)
  }, [date])


const data = useSelector((state: RootState) => state.attendance);

return { ...data, refresh: fetchDataFromApi };
};

export default useAttendance
