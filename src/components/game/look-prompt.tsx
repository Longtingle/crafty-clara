import {useState} from 'react';
import {cn} from '@/lib/utils.ts';
import {Button} from '@/components/ui/button.tsx';

interface LookPromptProps {
    /** who starts the round: "You start", "Opponent 1 starts" */
    starter: string;
    /** ms until play starts (GameScreen counts it down) */
    left: number;
    /** ms everyone had to look, in all */
    total: number;
    /** the others not ready yet, once you are; null until you are */
    waitingFor: string[] | null;
    onReady: () => void;
    /** a panel over the table, as on a phone, where the status line already says who starts */
    floating?: boolean;
}

// The start of a round, while everyone looks over their hand before anyone
// moves: how long until play starts, and Ready to start sooner.
function LookPrompt({starter, left, total, waitingFor, onReady, floating = false}: LookPromptProps) {
    // once you've said so, you're ready, even before the host hears it
    let [sent, setSent] = useState(false);
    let seconds = Math.ceil(left / 1000);
    let ready = sent || waitingFor !== null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "flex items-center gap-4 rounded-2xl",
                floating
                    ? "gap-3.5 border border-white/10 bg-card py-2.5 pr-2.5 pl-3.5 shadow-[0_10px_30px_rgb(0_0_0/0.45)]"
                    : "min-h-17 max-w-[720px] bg-black/30 py-2.5 pr-2.5 pl-4 compact:min-h-0 compact:py-2"
            )}
        >
            <span aria-hidden="true" className={cn("relative flex-none", floating ? "size-10.5" : "size-11.5")}>
                <svg viewBox="0 0 36 36" className="size-full -rotate-90 text-gold">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="3.5" />
                    {/* the ring empties as the time runs out, a second at a time (not
                        smoothly: a phone would repaint it every frame) */}
                    <circle
                        cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"
                        pathLength="100" strokeDasharray="100" strokeDashoffset={100 - 100 * left / total}
                    />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-base font-extrabold text-gold">{seconds}</span>
            </span>
            <span className="flex min-w-0 flex-col gap-px text-left">
                <span className={cn("font-bold whitespace-nowrap", floating ? "text-base" : "text-[17px]")}>
                    {ready ? "Ready" : "Look over your hand"}
                </span>
                <span className={cn("text-muted-foreground", floating ? "text-[13px] whitespace-nowrap" : "text-sm")}>
                    {ready && waitingFor && waitingFor.length > 0
                        ? "Waiting for " + waitingFor.join(" and ") + "."
                        : (
                            <>
                                {floating ? "Play starts" : starter + " the round"}
                                <span aria-hidden="true"> in {seconds} {seconds === 1 ? "second" : "seconds"}</span>.
                            </>
                        )}
                </span>
            </span>
            {!ready && (
                <Button
                    size="lg"
                    onClick={() => {
                        setSent(true);
                        onReady();
                    }}
                    className="ml-1.5 rounded-xl px-5 text-base"
                >
                    Ready
                </Button>
            )}
        </div>
    );
}

export default LookPrompt;
