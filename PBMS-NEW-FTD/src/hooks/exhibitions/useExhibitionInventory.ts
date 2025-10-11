import { useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { fetchDataStart, fetchDataSuccess, fetchDataFailure } from "../../redux/slices/exhibition/exhibitionInventoryRecordSlice";
import { apiRequest } from "../../libs/apiConfig";
import type { RootState } from "../../redux/store";
import { ExhibitionEndpoints } from "../../endpoints/exhibitions/exhibitionEndpoints";

const useExhibitionInventoryRecords = () => {
  const dispatch = useDispatch();
  //const { token, isFetchingLocalToken } = useAuth();

  const fetchDataFromApi = async () => {
    //if (isFetchingLocalToken || !token?.access_token) return;

    dispatch(fetchDataStart()); // Dispatch action to indicate data fetching has started

    try {
      const response = await apiRequest(
          ExhibitionEndpoints.EXHIBITION_INVENTORY.fetch_all,
          "GET",
            '',
      );
      if (response.status == 200) {
        //console.log('subs data', response.data)
        dispatch(fetchDataSuccess(response.data)); // Dispatch action with fetched data
      } else {
        throw new Error("Failed to fetch exhibition inventory records.");
      }
    } catch (error) {
      console.error("Failed to fetch exhibition inventory records:", error);
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


const data = useSelector((state: RootState) => state.exhibitionInventoryRecord);

return { ...data, refresh: fetchDataFromApi };
};

export default useExhibitionInventoryRecords;
