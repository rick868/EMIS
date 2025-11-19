import React from "react";
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

// Format currency (KSH - Kenyan Shillings)
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

// Validation helpers
export const validators = {
  departmentName: (name) => {
    if (!name || name.trim().length === 0) {
      return 'Department name is required';
    }
    if (name.length < 2) {
      return 'Department name must be at least 2 characters';
    }
    if (name.length > 100) {
      return 'Department name must be less than 100 characters';
    }
    if (!/^[a-zA-Z0-9\s\-_&]+$/.test(name)) {
      return 'Department name can only contain letters, numbers, spaces, hyphens, underscores, and ampersands';
    }
    return null;
  },

  categoryName: (name) => {
    if (!name || name.trim().length === 0) {
      return 'Category name is required';
    }
    if (name.length < 2) {
      return 'Category name must be at least 2 characters';
    }
    if (name.length > 100) {
      return 'Category name must be less than 100 characters';
    }
    if (!/^[a-zA-Z0-9\s\-_&]+$/.test(name)) {
      return 'Category name can only contain letters, numbers, spaces, hyphens, underscores, and ampersands';
    }
    return null;
  },

  employeeName: (name) => {
    if (!name || name.trim().length === 0) {
      return 'Employee name is required';
    }
    if (name.length < 2) {
      return 'Employee name must be at least 2 characters';
    }
    if (name.length > 100) {
      return 'Employee name must be less than 100 characters';
    }
    return null;
  },

  email: (email) => {
    if (!email || email.trim().length === 0) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  password: (password) => {
    if (!password || password.length === 0) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  },

  salary: (salary) => {
    if (salary === undefined || salary === null || salary === '') {
      return 'Salary is required';
    }
    const numSalary = parseFloat(salary);
    if (isNaN(numSalary)) {
      return 'Salary must be a valid number';
    }
    if (numSalary < 0) {
      return 'Salary cannot be negative';
    }
    if (numSalary > 100000000) {
      return 'Salary cannot exceed KSh 100,000,000';
    }
    return null;
  },
};

// Debounce utility for search inputs
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Input sanitization helper
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};
