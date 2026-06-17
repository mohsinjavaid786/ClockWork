interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-dove bg-card py-16 text-center">
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {description && <p className="mt-1 text-[13px] text-graphite">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
