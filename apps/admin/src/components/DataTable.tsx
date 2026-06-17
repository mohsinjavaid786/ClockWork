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
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, data, keyFn, className, onRowClick }: Props<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-card bg-card shadow-card', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hair">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-[13px] font-medium uppercase tracking-[0.04em] text-graphite',
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
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-hair transition-colors last:border-0 hover:bg-fog',
                onRowClick && 'cursor-pointer',
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3.5 text-[14px] text-ink', col.className)}>
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
