import { useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { fetchDataStart, fetchDataSuccess, fetchDataFailure } from "../../redux/slices/exhibition/exhibitionStoreInventory";
import { apiRequest } from "../../libs/apiConfig";
import type { RootState } from "../../redux/store";
import { ExhibitionEndpoints } from "../../endpoints/exhibitions/exhibitionEndpoints";

const useExhibitionStoreInventory = (id: string) => {
  const dispatch = useDispatch();
  //const { token, isFetchingLocalToken } = useAuth();

  const fetchDataFromApi = async (id: string) => {
    //if (isFetchingLocalToken || !token?.access_token) return;

    dispatch(fetchDataStart());

    try {
      const response = await apiRequest(
          ExhibitionEndpoints.EXHIBITION_POS.fetchExhibitionStoreInventory(id),
          "GET",
            '',
      );

      if (response.status == 200) {
        dispatch(fetchDataSuccess(response.data));
      } else {
        throw new Error("Failed to fetch exhibition store inventory.");
      }
    } catch (error) {
      console.error("Failed to fetch exhibition store inventory:", error);
      dispatch(
        fetchDataFailure(
          error instanceof Error ? error.message : "An unknown error occurred."
        )
      );
    }
  };

  useEffect(()=> {
    fetchDataFromApi(id)
  }, [id])


const data = useSelector((state: RootState) => state.exhibitionStoreInventory);

return { ...data, refresh: fetchDataFromApi };
};

export default useExhibitionStoreInventory
