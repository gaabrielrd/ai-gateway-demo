import { cn } from '@/shared/lib/cn';
import { Inbox } from 'lucide-react';
function Empty({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-balance md:p-12',
        className,
      )}
      {...props}
    >
      <Inbox className="icon" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export { Empty };
