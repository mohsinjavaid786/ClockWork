import { cn } from '@/lib/utils';

interface Props {
  status: 'active' | 'inactive' | 'running' | 'stopped' | string;
  label?: string;
}

const DEFAULT = 'bg-fog text-graphite';

const variants: Record<string, string> = {
  active: 'bg-success-bg text-success',
  running: 'bg-success-bg text-success',
  accepted: 'bg-success-bg text-success',
  paused: 'bg-warning-bg text-warning',
  pending: 'bg-warning-bg text-warning',
  inactive: DEFAULT,
  stopped: DEFAULT,
  member: DEFAULT,
  admin: 'bg-info-bg text-info',
};

export function StatusBadge({ status, label }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        variants[status] ?? DEFAULT,
      )}
    >
      {label ?? status}
    </span>
  );
}
