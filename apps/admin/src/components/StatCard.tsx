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
    <div
      className={cn(
        'rounded-lg border border-[#2A2A2A] bg-[#111111] p-5',
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-widest text-[#666666]">{label}</p>
      <p className="mt-2 font-mono text-3xl font-semibold text-white">{value}</p>
      {(sub !== undefined || trend !== undefined) && (
        <div className="mt-1 flex items-center gap-2">
          {sub && <span className="text-xs text-[#666666]">{sub}</span>}
          {trend !== undefined && (
            <span
              className={cn('text-xs font-medium', trend >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]')}
            >
              {trend >= 0 ? '+' : ''}
              {trend}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
