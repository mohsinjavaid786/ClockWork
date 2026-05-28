import { clsx } from 'clsx';

interface Props {
  variant: 'success' | 'error' | 'warning' | 'default';
  children: React.ReactNode;
}

const VARIANTS = {
  success: 'bg-green-900 text-green-300',
  error: 'bg-red-900 text-red-300',
  warning: 'bg-yellow-900 text-yellow-300',
  default: 'bg-slate-700 text-slate-300',
};

export function Badge({ variant, children }: Props) {
  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', VARIANTS[variant])}>
      {children}
    </span>
  );
}
