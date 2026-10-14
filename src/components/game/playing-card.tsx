import {useEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {motion, type HTMLMotionProps} from 'motion/react';
import {cn} from '@/lib/utils.ts';
import {isWild, type Card, type SetrunType} from '@/engine/cards.ts';
import {longName, standInName} from '@/engine/card-names.ts';
import {cardImage, FLIGHT} from './cards.ts';

interface PlayingCardProps {
    card: Card;
    /** set when the card is in a setrun, so a wild ace can show what it stands in for */
    setrunType?: SetrunType;
    alt?: string;
    className?: string;
    style?: CSSProperties;
}

// A card face. Size it with a width class; the height follows the image.
// Inside a setrun (setrunType set), a wild ace shows what it stands in for.
function PlayingCard({card, setrunType, alt, className, style}: PlayingCardProps) {
    return (
        <span className={cn("relative block card-face", className)} style={style}>
            <img
                src={cardImage(card.displayString)}
                alt={alt ?? longName(card)}
                draggable={false}
                className="block size-full rounded-[5%/3.3%] shadow-[0_2px_6px_rgb(0_0_0/0.35)]"
            />
            {setrunType && isWild(card) && (
                <span className="absolute -top-2.5 left-0 rounded-full border-[1.5px] border-white bg-wild px-1.5 text-[11px] leading-4 font-bold whitespace-nowrap text-white">
                    {"=" + standInName(card, setrunType)}
                </span>
            )}
        </span>
    );
}

type MovingCardProps = Omit<HTMLMotionProps<"span">, "id" | "layoutId"> & {
    /** the card's id */
    id: string;
};

// Wraps whatever shows one physical card (by card.id) on the table. Every
// element showing the same card shares a layoutId, so when the card moves
// between the deck, the discard pile, a hand and a setrun, Motion flies it
// from where it was. Render each id in one place only: Motion hides all but
// the newest element with a given layoutId.
function MovingCard({id, className, style, children, ...motionProps}: MovingCardProps) {
    // Raise the card while it flies, so it passes over the rest of the table.
    // Motion doesn't report the end of an animation it cancels (it does that
    // when the window resizes), so the raise also wears off by itself.
    let [flying, setFlying] = useState(false);
    let timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    let land = () => {
        clearTimeout(timer.current);
        setFlying(false);
    }
    let takeOff = () => {
        clearTimeout(timer.current);
        setFlying(true);
        timer.current = setTimeout(land, 1000);
    }
    useEffect(() => () => clearTimeout(timer.current), []);
    return (
        <motion.span
            layoutId={id}
            transition={FLIGHT}
            onLayoutAnimationStart={takeOff}
            onLayoutAnimationComplete={land}
            className={cn("relative block", className)}
            style={{...style, zIndex : flying ? 30 : style?.zIndex}}
            {...motionProps}
        >
            {children}
        </motion.span>
    );
}

function CardBack({className}: {className?: string}) {
    return <span aria-hidden="true" className={cn("block card-back", className)} />;
}

// A small pill on top of a card, such as "New" on the card just drawn.
function CardTag({children, className}: {children: ReactNode; className?: string}) {
    return (
        <span className={cn("absolute -top-3 left-1.5 z-10 rounded-full bg-cream px-2 py-px text-[11px] font-bold tracking-wider whitespace-nowrap text-[#12402a] uppercase", className)}>
            {children}
        </span>
    );
}

export {PlayingCard, MovingCard, CardBack, CardTag};
