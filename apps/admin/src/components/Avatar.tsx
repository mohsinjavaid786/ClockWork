import { cn } from '@/lib/utils';

interface Props {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-11 w-11 text-base' };

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: Props) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] font-medium text-white flex-shrink-0',
        sizes[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
