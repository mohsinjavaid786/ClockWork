import { cn } from '@/lib/utils';

interface Props {
  status: 'active' | 'inactive' | 'running' | 'stopped' | string;
  label?: string;
}

const NEUTRAL = 'bg-fog text-ash';

// Every status carries a clear colour so it reads at a glance.
const variants: Record<string, { cls: string; dot: string }> = {
  active: { cls: 'bg-success-bg text-success', dot: 'bg-success' },
  running: { cls: 'bg-success-bg text-success', dot: 'bg-success' },
  accepted: { cls: 'bg-success-bg text-success', dot: 'bg-success' },
  completed: { cls: 'bg-success-bg text-success', dot: 'bg-success' },
  paused: { cls: 'bg-warning-bg text-warning', dot: 'bg-warning' },
  pending: { cls: 'bg-warning-bg text-warning', dot: 'bg-warning' },
  stopped: { cls: 'bg-error-bg text-error', dot: 'bg-error' },
  failed: { cls: 'bg-error-bg text-error', dot: 'bg-error' },
  inactive: { cls: 'bg-fog text-ash', dot: 'bg-dove' },
  archived: { cls: 'bg-fog text-ash', dot: 'bg-dove' },
  admin: { cls: 'bg-info-bg text-info', dot: 'bg-info' },
  member: { cls: NEUTRAL, dot: 'bg-graphite' },
};

export function StatusBadge({ status, label }: Props) {
  const v = variants[status] ?? { cls: NEUTRAL, dot: 'bg-graphite' };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        v.cls,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', v.dot)} />
      {label ?? status}
    </span>
  );
}
