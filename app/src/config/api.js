import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Change this to your backend URL
// For development: use your computer's IP address (e.g., http://192.168.0.109:5000)
// For production: use your deployed backend URL
export const API_BASE_URL = 'https://restaruntbot1.onrender.com';

// Event emitter for auth events
let authLogoutCallback = null;

export const setAuthLogoutCallback = (callback) => {
  authLogoutCallback = callback;
};

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 60000, // Increased to 60 seconds for image uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear stored credentials
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('role');
      
      // Trigger logout in AuthContext
      if (authLogoutCallback) {
        authLogoutCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
