import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 5000);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message, duration = 5000) => {
    return addToast({ type: 'success', message, duration });
  }, [addToast]);

  const error = useCallback((message, duration = 5000) => {
    return addToast({ type: 'error', message, duration });
  }, [addToast]);

  const info = useCallback((message, duration = 5000) => {
    return addToast({ type: 'info', message, duration });
  }, [addToast]);

  const warning = useCallback((message, duration = 5000) => {
    return addToast({ type: 'warning', message, duration });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, info, warning, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }) {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
  };

  const Icon = icons[toast.type] || Info;

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-top-5',
        styles[toast.type]
      )}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium break-words">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 rounded-md p-1 hover:bg-black/10 transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

