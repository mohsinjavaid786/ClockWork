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
      <div className="absolute inset-0 bg-black/[0.32]" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-[24px] bg-card shadow-modal',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-hair px-6 py-4">
          <h2 className="text-[18px] font-medium text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-graphite transition-colors hover:bg-fog hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
