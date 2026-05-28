interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#2A2A2A] bg-[#111111] py-16 text-center">
      <p className="font-mono text-sm font-medium text-white">{title}</p>
      {description && <p className="mt-1 text-xs text-[#666666]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
