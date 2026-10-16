import {AnimatePresence, motion} from 'motion/react';
import {cn} from '@/lib/utils.ts';

/** What an opponent is saying. */
export interface Bubble {
    /** new for each line, so each pops up afresh */
    key: number;
    text: string;
}

interface SpeechBubbleProps {
    bubble: Bubble | null | undefined;
    /** who's speaking, for screen readers */
    name: string;
    /** where the speaker's portrait is: above the bubble, or to its left */
    from: "above" | "left";
    className?: string;
}

// What an opponent says, in a bubble by their portrait, for as long as the
// line lasts. It pops out of the portrait, over cards even as they fly (z-30),
// and lets clicks through to the melds underneath.
function SpeechBubble({bubble, name, from, className}: SpeechBubbleProps) {
    return (
        <AnimatePresence>
            {bubble && (
                <motion.p
                    key={bubble.key}
                    initial={{opacity : 0, scale : 0.6}}
                    animate={{opacity : 1, scale : 1}}
                    exit={{opacity : 0, scale : 0.92, transition : {duration : 0.2}}}
                    transition={{type : "spring", stiffness : 500, damping : 28}}
                    style={{transformOrigin : (from === "above") ? "30px 0" : "0 50%"}}
                    className={cn(
                        "pointer-events-none absolute z-40 w-max rounded-2xl bg-cream px-3.5 py-2 text-[15px] leading-snug font-semibold text-[#12402a] shadow-[0_8px_22px_rgb(0_0_0/0.4)]",
                        className
                    )}
                >
                    <span
                        aria-hidden="true"
                        className={cn("absolute size-3.5 rotate-45 rounded-[3px] bg-cream", (from === "above") ? "-top-1.5 left-6" : "top-1/2 -left-1.5 -mt-1.75")}
                    />
                    <span className="sr-only">{name} says: </span>
                    <span className="relative">{bubble.text}</span>
                </motion.p>
            )}
        </AnimatePresence>
    );
}

export default SpeechBubble;
