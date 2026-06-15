import { cn } from '@/lib/utils';

interface Props {
  status: 'active' | 'inactive' | 'running' | 'stopped' | string;
  label?: string;
}

const variants: Record<string, string> = {
  active: 'bg-[#052e16] text-[#22c55e] border border-[#14532d]',
  running: 'bg-[#052e16] text-[#22c55e] border border-[#14532d]',
  inactive: 'bg-[#1c1917] text-[#a1a1a1] border border-[#2A2A2A]',
  stopped: 'bg-[#1c1917] text-[#a1a1a1] border border-[#2A2A2A]',
  admin: 'bg-[#111827] text-white border border-[#374151]',
  member: 'bg-[#1A1A1A] text-[#a1a1a1] border border-[#2A2A2A]',
  accepted: 'bg-[#052e16] text-[#22c55e] border border-[#14532d]',
  pending: 'bg-[#2a1c05] text-[#eab308] border border-[#713f12]',
};

export function StatusBadge({ status, label }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        variants[status] ?? 'bg-[#1A1A1A] text-[#a1a1a1] border border-[#2A2A2A]',
      )}
    >
      {label ?? status}
    </span>
  );
}
