import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import { Button } from './button';

export function Disclosure({
  title,
  children,
  defaultOpen,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="group h-auto whitespace-normal text-left">
          {title}
          <ChevronDown
            aria-hidden="true"
            className="icon icon-sm group-data-[state=open]:rotate-180"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
