import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  keyFn: (row: T) => string;
  className?: string;
}

export function DataTable<T>({ columns, data, keyFn, className }: Props<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-[#2A2A2A]', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2A2A2A] bg-[#111111]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#666666]',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyFn(row)}
              className="border-b border-[#1F1F1F] bg-[#0A0A0A] transition-colors hover:bg-[#111111]"
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-[#A1A1A1]', col.className)}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
