import { Popover as Primitive } from 'radix-ui';
import type { ComponentProps } from 'react';

export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;

export function PopoverContent(props: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content align="start" sideOffset={6} collisionPadding={12} {...props} />
    </Primitive.Portal>
  );
}
