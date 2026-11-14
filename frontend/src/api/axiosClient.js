import axios from "axios";
import { getAccessToken } from "./authToken";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
export const mockResolve = (value, delay = 150) =>
  new Promise((resolve) => setTimeout(() => resolve(value), delay));

export default axiosClient;