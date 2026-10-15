import type {ComponentProps} from 'react';
import {Switch as SwitchPrimitive} from 'radix-ui';
import {cn} from '@/lib/utils.ts';

// An on/off switch: gold when on.
function Switch({className, ...props}: ComponentProps<typeof SwitchPrimitive.Root>) {
    return (
        <SwitchPrimitive.Root
            className={cn(
                "inline-flex h-8 w-14 flex-none cursor-pointer items-center rounded-full bg-white/22 p-1 transition-colors outline-none",
                "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=checked]:bg-gold",
                className
            )}
            {...props}
        >
            <SwitchPrimitive.Thumb
                className={cn(
                    "block size-6 rounded-full bg-cream shadow-[0_1px_3px_rgb(0_0_0/0.4)] transition-transform",
                    "data-[state=checked]:translate-x-6 data-[state=checked]:bg-gold-foreground"
                )}
            />
        </SwitchPrimitive.Root>
    );
}

export {Switch};
