import axios from 'axios';
import API_BASE_URL from '../config';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Always send cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token to headers
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('jobToken');
    
    // If token exists, add it to Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
  (response) => {
    // If response contains a token, store it
    if (response.data && response.data.token) {
      localStorage.setItem('jobToken', response.data.token);
    }
    return response;
  },
  (error) => {
    // If 401 error (unauthorized), clear token and redirect to login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('jobToken');
      // You can add additional logic here like redirecting to login
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
