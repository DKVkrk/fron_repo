// src/utils/axios.js
import axios from "axios";
import SummaryApi , { baseURL } from "../common/SummaryApi";

const instance = axios.create({
  baseURL: baseURL,
  withCredentials: true,
});
// Add auth token interceptor
instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});



export default instance;