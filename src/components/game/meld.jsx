import {cn} from '@/lib/utils.js';
import {setrunCaption, isStandIn} from '@/game-functions/card-names.js';
import {PlayingCard, MovingCard} from './playing-card.jsx';

// A setrun on the table. It is a button only while the selected card can be
// added to it (target is then {label}, e.g. "Add 7♦" or "Swap for A♥").
function Meld({setrun, target, dimmed, onClick}) {
    let caption = setrunCaption(setrun);
    let hasWild = setrun.cards.some(isStandIn);
    return (
        <button
            type="button"
            disabled={!target}
            onClick={onClick}
            aria-label={caption + (hasWild ? ", with a wild ace" : "") + (target ? ". " + target.label : "")}
            className={cn(
                "relative flex flex-none flex-col items-start gap-1.5 rounded-xl border-2 border-transparent bg-black/18 px-(--meld-pad-x) pt-3 pb-1.5 transition short:pt-2.5 short:pb-1",
                target && "border-gold shadow-[0_0_0_5px_rgb(245_184_61/0.22)] hover:brightness-110",
                dimmed && "opacity-50"
            )}
        >
            <span className="meld-fan flex">
                {setrun.cards.map(card => (
                    <MovingCard key={card.id} id={card.id} className="w-(--meld-w)">
                        <PlayingCard card={card} setrunType={setrun.type} alt="" className="w-full" />
                    </MovingCard>
                ))}
            </span>
            {/* as wide as the cards, never wider, so MeldRow's sums hold */}
            <span className="w-0 min-w-full truncate text-xs text-muted-foreground short:hidden">{caption}</span>
            {target && (
                <span className="absolute -top-3 right-2 rounded-full bg-gold px-2 py-0.5 text-xs font-bold whitespace-nowrap text-gold-foreground">
                    {target.label}
                </span>
            )}
        </button>
    );
}

// Setruns side by side. Their cards shrink so the row fits its width, the way
// the hand's overlap does, so a row of setruns never wraps and pushes the
// table down. A setrun is as wide as its fan of cards (each card after the
// first adds 38% of a card width, see .meld-fan) plus a 2px border and
// --meld-pad-x on each side; --meld-gap separates them. Wrapping is left on
// only for when the cards hit their smallest size.
function MeldRow({setruns, className, children}) {
    let cardWidths = setruns.reduce((sum, setrun) => sum + 1 + 0.38 * (setrun.cards.length - 1), 0);
    let fixed = setruns.length + " * (2 * var(--meld-pad-x) + 4px) + " + Math.max(setruns.length - 1, 0) + " * var(--meld-gap) + 2px";
    let fit = setruns.length
        ? {"--meld-w" : "max(26px, min(var(--meld-w-full), (100cqi - (" + fixed + ")) / " + cardWidths + "))"}
        : undefined;
    return (
        <div className={cn("@container flex w-full flex-wrap gap-(--meld-gap)", className)} style={fit}>
            {children}
        </div>
    );
}

export default Meld;
export {MeldRow};
