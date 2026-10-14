import axios from "axios";

const BASE_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}/api`;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // for sending cookies (auth)
});

export default axiosInstance;