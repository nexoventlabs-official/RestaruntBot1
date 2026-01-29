import axios from 'axios';

const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || 'https://restaruntbot1.onrender.com/api',
  timeout: 15000 // 15 second timeout to prevent infinite loading
});

// Log the API URL for debugging
console.log('API Base URL:', api.defaults.baseURL);

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    // Log errors for debugging
    console.error('API Error:', err.response?.status, err.response?.data || err.message);
    
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

export default api;
