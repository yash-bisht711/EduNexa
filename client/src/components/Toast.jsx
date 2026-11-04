import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastId = 0;

const ICONS = {
  success: <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />,
  error: <XCircle size={18} className="text-rose-500 shrink-0" />,
  info: <Info size={18} className="text-blue-500 shrink-0" />,
};

const BG = {
  success: 'bg-emerald-50 border-emerald-200',
  error: 'bg-rose-50 border-rose-200',
  info: 'bg-blue-50 border-blue-200',
};

const TEXT = {
  success: 'text-emerald-800',
  error: 'text-rose-800',
  info: 'text-blue-800',
};

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onRemove]);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-soft text-sm font-medium max-w-sm w-full pointer-events-auto
        ${BG[toast.type]} ${TEXT[toast.type]} animate-slide-in`}
      style={{ animation: 'slideIn .22s cubic-bezier(.4,0,.2,1)' }}
    >
      {ICONS[toast.type]}
      <span className="flex-1 leading-5">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="opacity-50 hover:opacity-100 transition mt-0.5"
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-[999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
