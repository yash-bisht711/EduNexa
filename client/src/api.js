import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('edunexa_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const errorMessage = (err) =>
  err.response?.data?.message || err.message || 'Something went wrong';

export default api;
