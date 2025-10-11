import { useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { fetchDataStart, fetchDataSuccess, fetchDataFailure } from "../../redux/slices/expenses/branchExpenseSlice";
import { apiRequest } from "../../libs/apiConfig";
import type { RootState } from "../../redux/store";
import { BranchExpenseEndpoints } from "../../endpoints/expense/expenseEndpoints";

const useBranchExpense = (id: string) => {
  const dispatch = useDispatch();
  //const { token, isFetchingLocalToken } = useAuth();

  const fetchDataFromApi = async () => {
    //if (isFetchingLocalToken || !token?.access_token) return;

    dispatch(fetchDataStart()); // Dispatch action to indicate data fetching has started

    try {
      const response = await apiRequest(
          BranchExpenseEndpoints.fetchExpenses(id),
          "GET",
            '',
      );
      //console.log(response)
      if (response.status == 200) {
        //console.log('subs data', response.data)
        dispatch(fetchDataSuccess(response.data)); // Dispatch action with fetched data
      } else {
        throw new Error("Failed to fetch expenses.");
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      dispatch(
        fetchDataFailure(
          error instanceof Error ? error.message : "An unknown error occurred."
        )
      );
    }
  };

  useEffect(()=> {
    fetchDataFromApi()
  }, [id])


const data = useSelector((state: RootState) => state.branchExpense);

return { ...data, refresh: fetchDataFromApi };
};

export default useBranchExpense;
