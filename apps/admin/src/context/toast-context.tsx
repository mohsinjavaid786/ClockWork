'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastType, { border: string; icon: React.ReactNode }> = {
  success: { border: '#14532d', icon: <CheckCircle2 size={16} className="text-[#22c55e]" /> },
  error: { border: '#3f1515', icon: <AlertCircle size={16} className="text-[#ef4444]" /> },
  info: { border: '#2A2A2A', icon: <Info size={16} className="text-[#A1A1A1]" /> },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = nextId.current++;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 3800);
    },
    [dismiss],
  );

  const success = useCallback((m: string) => toast(m, 'success'), [toast]);
  const error = useCallback((m: string) => toast(m, 'error'), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-lg border bg-[#111111] px-4 py-3 shadow-2xl"
            style={{ borderColor: STYLES[t.type].border, animation: 'cw-toast-in 160ms ease-out' }}
          >
            {STYLES[t.type].icon}
            <span className="text-sm text-white">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-2 text-[#666666] transition-colors hover:text-white"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <style>{`@keyframes cw-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
