import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// API helper functions
let API_BASE_URL = 'http://localhost:3001';

export const setApiUrl = (url) => {
  API_BASE_URL = url;
};

export const getApiUrl = () => API_BASE_URL;

// Storage helper (using sessionStorage instead of localStorage for security)
export const storage = {
  getToken: () => sessionStorage.getItem('auth_token'),
  setToken: (token) => sessionStorage.setItem('auth_token', token),
  removeToken: () => sessionStorage.removeItem('auth_token'),
  getUser: () => {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (user) => sessionStorage.setItem('user', JSON.stringify(user)),
  removeUser: () => sessionStorage.removeItem('user'),
  clear: () => {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user');
  },
};

// API fetch wrapper
export const apiFetch = async (endpoint, options = {}) => {
  const token = storage.getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      storage.clear();
      window.location.href = '/';
      throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
};

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Format date
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Format date and time
export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
