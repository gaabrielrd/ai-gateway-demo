import { cn } from '@/shared/lib/cn';
import { Loader2Icon } from 'lucide-react';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      aria-hidden="true"
      className={cn('icon icon-sm animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
