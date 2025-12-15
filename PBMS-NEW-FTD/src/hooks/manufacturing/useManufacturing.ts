import { useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { fetchDataStart, fetchDataSuccess, fetchDataFailure } from "../../redux/slices/manufacturing/manufacturingSlice";
import { apiRequest } from "../../libs/apiConfig";
import type { RootState } from "../../redux/store";
import { ManufacturingEndpoints } from "../../endpoints/manufacturing/manufacturingEndpoints";

const useManufacturing = () => {
  const dispatch = useDispatch();

  const fetchDataFromApi = async () => {
    dispatch(fetchDataStart());

    try {
      const response = await apiRequest(
        ManufacturingEndpoints.fetch_all,
        "GET",
        '',
      );
      
      if (response.status === 200) {
        dispatch(fetchDataSuccess(response.data));
      } else {
        throw new Error("Failed to fetch manufacturing records.");
      }
    } catch (error) {
      console.error("Failed to fetch manufacturing records:", error);
      dispatch(
        fetchDataFailure(
          error instanceof Error ? error.message : "An unknown error occurred."
        )
      );
    }
  };

  useEffect(() => {
    fetchDataFromApi();
  }, []);

  const data = useSelector((state: RootState) => state.manufacturing);

  return { ...data, refresh: fetchDataFromApi };
};

export default useManufacturing;

