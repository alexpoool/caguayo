import { cn } from '@/shared/ui/utils/cn';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

export function Avatar({ src, alt, className }: AvatarProps) {
  const fallback = '/default.jpg';
  return (
    <img
      src={src || fallback}
      alt={alt || 'Avatar'}
      className={cn('rounded-full object-cover', className)}
    />
  );
}

export default Avatar;
