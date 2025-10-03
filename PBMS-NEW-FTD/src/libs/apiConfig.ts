import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios"
import { toast } from "sonner";

export const baseURL = "http://localhost:3005"
export const imageURL = "http://localhost:3005/storage"

// export const baseURL = "https://api.pbms.com/api"
// export const imageURL = "https://api.pbms.com/storage"

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
};

export const apiRequest = async <T>(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE" = "GET",
  token?: string,
  data?: any,
  retry = true
): Promise<T> => {
  const url = `${baseURL}${endpoint}`;

  const config: AxiosRequestConfig = {
    url,
    method,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
    ...(data && { data }),
  };

  try {
    const response: AxiosResponse<T> = await axios.request(config);
    
    // Only show success toast for non-GET requests that have a message
    if (method !== 'GET' && (response.data as any)?.message) {
      toast.success((response.data as any).message);
    }
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data as any;
      
      // Auto-refresh token on 401 and retry the request
      if (error.response?.status === 401 && retry) {
        if (isRefreshing) {
          // Queue the request while token is being refreshed
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => apiRequest<T>(endpoint, method, data, false))
            .catch((err) => Promise.reject(err));
        }

        isRefreshing = true;

        try {
          // Attempt to refresh the token
          await axios.post(`${baseURL}/api/auth/refresh`, {}, { 
            withCredentials: true 
          });
          
          processQueue();
          return apiRequest<T>(endpoint, method, data, false);
        } catch (refreshError) {
          processQueue(refreshError); 
          toast.error("Session expired. Please login again.");
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
          throw refreshError;
        } finally {
          isRefreshing = false;
        }
      }

      if (responseData?.message) {
        toast.error(responseData.message);
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to perform this action");
      } else {
        toast.error("An error occurred");
      }
      
      throw error;
    }
    
    // Handle non-Axios related errors
    toast.error("An error occurred during the API request.");
    throw new Error("An error occurred during the API request.");
  }
};