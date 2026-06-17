import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  className?: string;
}

export function StatCard({ label, value, sub, trend, className }: Props) {
  return (
    <div className={cn('rounded-card bg-card p-5 shadow-card', className)}>
      <p className="text-[13px] text-graphite">{label}</p>
      <p className="mt-2 text-[32px] font-medium leading-none tracking-tight text-ink">{value}</p>
      {(sub !== undefined || trend !== undefined) && (
        <div className="mt-2 flex items-center gap-2">
          {trend !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                trend >= 0 ? 'text-success' : 'text-error',
              )}
            >
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span className="text-[13px] text-graphite">{sub}</span>}
        </div>
      )}
    </div>
  );
}
