interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[28px] font-medium leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-[15px] text-ash">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
