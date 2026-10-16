import {cn} from '@/lib/utils.ts';
import {ordinal} from './stats.ts';

interface PlaceStripProps {
    places: number[];
    className?: string;
    cellClassName?: string;
    /** ring the last one: the game just played */
    markLast?: boolean;
}

/** Where you finished in some games, oldest first, as a row of little tiles: gold for a win. */
function PlaceStrip({places, className, cellClassName, markLast = false}: PlaceStripProps) {
    return (
        <div
            role="img"
            aria-label={"Where you finished, oldest first: " + places.map(ordinal).join(", ")}
            className={cn("flex gap-1", className)}
        >
            {places.map((place, index) => (
                <span
                    key={index}
                    className={cn(
                        "grid size-6 place-items-center rounded-[6px] text-[13px] font-bold",
                        (place === 1) ? "bg-gold text-gold-foreground" : "bg-white/12",
                        markLast && index === places.length - 1 && "ring-2 ring-cream",
                        cellClassName
                    )}
                >
                    {place}
                </span>
            ))}
        </div>
    );
}

export default PlaceStrip;
