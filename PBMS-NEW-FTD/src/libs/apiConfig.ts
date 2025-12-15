import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios"
import { toast } from "sonner";

export const baseURL = "http://localhost:3005"
export const imageURL = "http://localhost:3005/storage"
// export const baseURL = "https://deinapi.smartclinic360.com"
// export const imageURL = "https://deinapi.smartclinic360.com/storage"
export const system = 'PBMS'

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
  token?: string, //--- IGNORE ---
  data?: any, // Remove token parameter since we're using cookies
  retry = true
): Promise<T> => {
  const url = `${baseURL}${endpoint}`;

  const config: AxiosRequestConfig = {
    url,
    method,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true, // This sends cookies automatically
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
          
          processQueue(null); // Process queued requests with success
          return apiRequest<T>(endpoint, method, data, false); // Retry original request
        } catch (refreshError) {
          processQueue(refreshError); // Process queued requests with error
          
          // Clear any stored user data and redirect to login
          localStorage.removeItem('persist:userAuth');
          sessionStorage.clear();
          
          toast.error("Session expired. Please login again.");
          setTimeout(() => {
            window.location.href = "/"; // Your login page
          }, 2000);
          throw refreshError;
        } finally {
          isRefreshing = false;
        }
      }

      // Handle other error cases
      if (responseData?.message) {
        toast.error(responseData.message);
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to perform this action");
      } else if (error.response?.status === 404) {
        toast.error("Resource not found");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else {
        toast.error("An error occurred");
      }
      
      throw error;
    }
    
    // Handle non-Axios related errors (network errors, etc.)
    toast.error("Network error. Please check your connection.");
    console.log(error)
    throw new Error("Network error occurred");
  }
};