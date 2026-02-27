import React from 'react';
import { cn } from '../../lib/utils';

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
