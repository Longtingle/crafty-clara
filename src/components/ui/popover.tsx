import type {ComponentProps} from 'react';
import {Popover as PopoverPrimitive} from 'radix-ui';
import {cn} from '@/lib/utils.ts';

const Popover = PopoverPrimitive.Root;
const PopoverAnchor = PopoverPrimitive.Anchor;

// A panel beside whatever anchors it, with an arrow pointing at it. It moves
// to the other side if there's no room.
function PopoverContent({className, children, sideOffset = 10, ...props}: ComponentProps<typeof PopoverPrimitive.Content>) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                sideOffset={sideOffset}
                collisionPadding={8}
                className={cn(
                    "z-50 rounded-2xl bg-popover p-3.5 text-popover-foreground shadow-[0_18px_40px_rgb(0_0_0/0.5)] ring-1 ring-border duration-100 outline-none",
                    "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                    className
                )}
                {...props}
            >
                {children}
                <PopoverPrimitive.Arrow width={18} height={9} className="fill-popover" />
            </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
    );
}

export {Popover, PopoverAnchor, PopoverContent};
