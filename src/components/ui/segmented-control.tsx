import type {ReactNode} from 'react';
import {cn} from '@/lib/utils.ts';
import {Button} from '@/components/ui/button.tsx';

// Our own, not from shadcn: one of a few choices, as a row of buttons with
// the chosen one in cream.

export interface Segment<T extends string> {
    value: T;
    label: ReactNode;
    className?: string;
}

interface SegmentedControlProps<T extends string> {
    options: Segment<T>[];
    value: T;
    onChange: (value: T) => void;
    /** the id of what the choice is called */
    labelledBy: string;
    /** for the group, which is a grid: say how many columns */
    className?: string;
    /** for each button */
    optionClassName?: string;
}

function SegmentedControl<T extends string>({options, value, onChange, labelledBy, className, optionClassName}: SegmentedControlProps<T>) {
    return (
        <div role="group" aria-labelledby={labelledBy} className={cn("grid gap-1 rounded-xl bg-black/30 p-1", className)}>
            {options.map(option => (
                <Button
                    key={option.value}
                    variant="ghost"
                    aria-pressed={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "aria-pressed:bg-cream aria-pressed:text-cream-foreground aria-pressed:hover:bg-cream aria-pressed:hover:text-cream-foreground",
                        optionClassName,
                        option.className
                    )}
                >
                    {option.label}
                </Button>
            ))}
        </div>
    );
}

export {SegmentedControl};
