import React from 'react';
import { Check } from 'lucide-react';

type VerifiedBadgeProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function VerifiedBadge({ size = 'md', className = '' }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <span
      title="Verified Profile"
      className={`inline-flex items-center justify-center rounded-full bg-blue-500 text-white font-bold shadow-md shadow-blue-500/30 shrink-0 ${sizeClasses[size]} ${className}`}
    >
      <Check className={`${iconSizes[size]} stroke-[3]`} />
    </span>
  );
}
