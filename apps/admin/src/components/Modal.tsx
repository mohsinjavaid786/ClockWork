'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-xl border border-[#2A2A2A] bg-[#111111] shadow-2xl',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
          <h2 className="font-mono text-sm font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#666666] hover:bg-[#1A1A1A] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
