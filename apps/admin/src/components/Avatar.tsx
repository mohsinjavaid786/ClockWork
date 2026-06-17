import { cn } from '@/lib/utils';

interface Props {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-[13px]', lg: 'h-11 w-11 text-[15px]' };

// Calm pastel tints (mint / sky / peach) chosen deterministically per name.
const tints = ['bg-[#c5e8d4]', 'bg-sky', 'bg-apricot'];

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: Props) {
  const tint = tints[name.charCodeAt(0) % tints.length];
  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-full font-medium text-ink',
        tint,
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
