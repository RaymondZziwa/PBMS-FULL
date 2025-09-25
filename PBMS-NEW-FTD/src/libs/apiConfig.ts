import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios"
import { toast } from "sonner";

export const baseURL = "http://localhost:3000"
export const imageURL = "https://localhost:3000/storage"

// export const baseURL = "https://api.pbms.com/api"
// export const imageURL = "https://api.pbms.com/storage"

export const apiRequest = async <T>(
    endpoint: string,
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" = "GET",
    token?: string,
    data?: any
  ): Promise<T> => {
    const url = `${baseURL}${endpoint}`;
  
    const config: AxiosRequestConfig = {
      url,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(data && { data }),
    };
  
    try {
      const response: AxiosResponse<T> = await axios.request(config);
      if (method !== 'GET') {
        toast.success(response.data.message)
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (error.response?.status === 401) {
          if (data?.message) {
            //toast.error(data.message);
          }
  
         // window.location.href = "/login";
        } else if (error.response?.status === 403) {
          //window.location.href = "/login";
        }
        throw error; // Rethrow the error for further handling if needed
      }
      // Handle non-Axios related errors
      throw new Error("An error occurred during the API request.");
    }
  };