import { useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { fetchDataStart, fetchDataSuccess, fetchDataFailure } from "../../redux/slices/farm/batchSlice";
import { apiRequest } from "../../libs/apiConfig";
import type { RootState } from "../../redux/store";
import { farmEndpoints } from "../../endpoints/farm/farmEndpoints";

const useSeedlingBatches = () => {
  const dispatch = useDispatch();
  //const { token, isFetchingLocalToken } = useAuth();

  const fetchDataFromApi = async () => {
    //if (isFetchingLocalToken || !token?.access_token) return;

    dispatch(fetchDataStart()); // Dispatch action to indicate data fetching has started

    try {
      const response = await apiRequest(
          farmEndpoints.seedlingBatch.fetchAll,
          "GET",
            '',
      );
      //console.log(response)
      if (response.status == 200) {
        //console.log('subs data', response.data)
        dispatch(fetchDataSuccess(response.data.items)); // Dispatch action with fetched data
      } else {
        throw new Error("Failed to fetch seedling batches.");
      }
    } catch (error) {
      console.error("Failed to fetch item seedling batches:", error);
      dispatch(
        fetchDataFailure(
          error instanceof Error ? error.message : "An unknown error occurred."
        )
      );
    }
  };

  useEffect(()=> {
    fetchDataFromApi()
  }, [])


const data = useSelector((state: RootState) => state.seedlingBatch);

return { ...data, refresh: fetchDataFromApi };
};

export default useSeedlingBatches;
