import type { ComponentProps } from 'react';
import { CircleAlert } from 'lucide-react';
import { Alert } from './alert';

export function ErrorMessage({ children, ...props }: ComponentProps<typeof Alert>) {
  return (
    <Alert variant="destructive" {...props}>
      <CircleAlert aria-hidden="true" className="icon icon-sm" />
      <div>{children}</div>
    </Alert>
  );
}
