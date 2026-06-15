'use client';

import { Globe } from 'lucide-react';
import { useTimezone, type TzMode } from '@/context/timezone-context';

export function TimezoneSelect() {
  const { mode, setMode, employeeTz, offsetLabel } = useTimezone();

  const options: { value: TzMode; label: string }[] = [
    { value: 'local', label: `My time (${offsetLabel('local')})` },
    { value: 'utc', label: 'UTC' },
  ];
  if (employeeTz) {
    options.push({ value: 'employee', label: `Employee's time (${offsetLabel('employee')})` });
  }

  return (
    <label className="flex items-center gap-2 text-xs text-[#666666]">
      <Globe size={13} />
      <span className="hidden sm:inline">Timezone</span>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as TzMode)}
        className="rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1.5 text-xs text-white outline-none focus:border-[#444]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
