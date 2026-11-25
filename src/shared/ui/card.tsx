import * as React from 'react';
import { cn } from '@/shared/lib/cn';

import { Slot } from 'radix-ui';
function Card({
  className,
  asChild,
  ...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div';
  return (
    <Comp
      data-slot="card"
      className={cn(
        'flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Card };
