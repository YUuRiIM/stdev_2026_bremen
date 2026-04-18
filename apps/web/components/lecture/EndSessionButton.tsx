'use client';

import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EndSessionButtonProps {
  onEnd: () => void;
  className?: string;
  label?: string;
}

export function EndSessionButton({
  onEnd,
  className,
  label = '끝내기',
}: EndSessionButtonProps) {
  return (
    <Button
      data-testid="lecture-end-btn"
      variant="destructive"
      size="lg"
      onClick={onEnd}
      className={cn(
        'gap-2 rounded-full px-6 text-base font-semibold shadow-xl',
        className,
      )}
    >
      <LogOut size={18} />
      {label}
    </Button>
  );
}
