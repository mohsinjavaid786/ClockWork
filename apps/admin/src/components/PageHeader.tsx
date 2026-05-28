interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-mono text-2xl font-semibold text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-[#666666]">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
