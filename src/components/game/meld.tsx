import {useId, type CSSProperties, type ReactNode} from 'react';
import {useDroppable} from '@dnd-kit/core';
import {cn} from '@/lib/utils.ts';
import {useShortScreen} from '@/lib/use-media-query.ts';
import {Popover, PopoverAnchor, PopoverContent} from '@/components/ui/popover.tsx';
import {RUN, isWild, type Card, type Setrun} from '@/engine/cards.ts';
import type {RunEnd, RunPlace} from '@/engine/setruns.ts';
import {setrunCaption, shortName, standInName} from '@/engine/card-names.ts';
import {PlayingCard, MovingCard} from './playing-card.tsx';
import type {MeldTarget} from './your-turn.ts';
import {meldTarget} from './drop-targets.ts';

/** A card that could go at either end of a run, and the run it would make at each. */
export interface EndChoice {
    card: Card;
    places: RunPlace[];
}

const RANK_WORDS: Record<number, string> = {1 : "Ace", 11 : "Jack", 12 : "Queen", 13 : "King", 14 : "Ace"};

// Which end of a run a card goes: each end with the cards it would join
// there, the card as what it would stand in for.
function EndChooser({choice, titleId, onChoose}: {choice: EndChoice; titleId: string; onChoose: (end: RunEnd) => void}) {
    return (
        <div className="flex flex-col gap-2.5 short:gap-2">
            <p id={titleId} className="pl-0.5 font-bold short:text-[15px]">Where should the {shortName(choice.card)} go?</p>
            <div className="grid grid-cols-2 gap-2">
                {choice.places.map(place => {
                    let low = place.end === "low";
                    let placed = low ? place.cards[0] : place.cards[place.cards.length - 1];
                    let next = low ? place.cards[1] : place.cards[place.cards.length - 2];
                    // the cards at that end, enough to see where it goes
                    let shown = low ? place.cards.slice(0, 4) : place.cards.slice(-4);
                    return (
                        <button
                            key={place.end}
                            type="button"
                            onClick={() => onChoose(place.end)}
                            className={cn(
                                "flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-white/16 bg-white/6 px-3 pt-3.5 pb-2.5 outline-none hover:border-gold hover:bg-white/10",
                                "focus-visible:border-gold focus-visible:shadow-[0_0_0_3px_rgb(245_184_61/0.35)] short:gap-1.5 short:pt-2.5 short:pb-2"
                            )}
                        >
                            <span aria-hidden="true" className="meld-fan flex [--meld-strip:0.5] [--meld-w:36px] short:[--meld-w:32px]">
                                {shown.map(card => <PlayingCard key={card.id} card={card} setrunType={RUN} alt="" className="w-(--meld-w)" />)}
                            </span>
                            <span className="font-bold whitespace-nowrap">As the {standInName(placed, RUN)}</span>
                            <span className="text-[12.5px] whitespace-nowrap text-muted-foreground short:hidden">
                                {low ? "Below" : "Above"} the {RANK_WORDS[next.value] ?? next.value}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

interface MeldProps {
    /** whose setrun it is, and which of theirs */
    seat: number;
    index: number;
    setrun: Setrun;
    /**
     * changes whenever the setruns in this one's row change size, which moves
     * or resizes its cards: the row's card count
     */
    rowSize: number;
    /** what the selected card would do here, if it can be played here */
    target: MeldTarget | null;
    dimmed: boolean;
    onClick: () => void;
    /** the selected card, while it asks which end of this run the card goes */
    choice: EndChoice | null;
    onChoose: (end: RunEnd) => void;
    onCancelChoice: () => void;
}

// A setrun on the table. It is a button only while the selected card can be
// played on it, and a card dragged from your hand can be dropped on it then.
// It lights up gold where the card fits, unless that hint is off. A card that
// could go at either end of a run asks which, over the run.
function Meld({seat, index, setrun, rowSize, target, dimmed, onClick, choice, onChoose, onCancelChoice}: MeldProps) {
    let caption = setrunCaption(setrun);
    // Motion measures the cards again only when they can have moved: when
    // this setrun changes, or its row grows and its cards shrink to fit
    let layout = setrun.cards.map(card => card.id).join() + ":" + rowSize;
    let hasWild = setrun.cards.some(isWild);
    let {setNodeRef, isOver} = useDroppable({id : meldTarget(seat, index)});
    let titleId = useId();
    // on a phone there's no room above a meld, but there is beside it
    let short = useShortScreen();
    let meld = (
        <button
            ref={setNodeRef}
            type="button"
            disabled={!target}
            onClick={onClick}
            aria-label={caption + (hasWild ? ", with a wild ace" : "") + (target?.lit ? ". " + target.label : "")}
            className={cn(
                "relative flex flex-none flex-col items-start gap-1.5 rounded-xl border-2 border-transparent bg-black/18 px-(--meld-pad-x) pt-3 pb-1.5 transition",
                // on a phone, just the cards, in their player's quarter of the table
                "short:rounded-md short:border-0 short:bg-transparent short:py-(--meld-pad-x)",
                target?.lit && "border-gold shadow-[0_0_0_5px_rgb(245_184_61/0.22)] hover:brightness-110 short:shadow-[0_0_0_3px_var(--gold),0_0_0_7px_rgb(245_184_61/0.25)]",
                target?.lit && isOver && "shadow-[0_0_0_7px_rgb(245_184_61/0.45)] brightness-110 short:shadow-[0_0_0_3px_var(--gold),0_0_0_9px_rgb(245_184_61/0.45)]",
                // unlit, it only shows where the card would go
                target && !target.lit && "hover:border-white/35 short:hover:shadow-[0_0_0_2px_rgb(255_255_255/0.35)]",
                target && !target.lit && isOver && "border-white/50 short:shadow-[0_0_0_2px_rgb(255_255_255/0.5)]",
                dimmed && "opacity-50"
            )}
        >
            <span className="meld-fan flex">
                {setrun.cards.map(card => (
                    <MovingCard key={card.id} id={card.id} layoutDependency={layout} className="w-(--meld-w)">
                        <PlayingCard card={card} setrunType={setrun.type} alt="" className="w-full" />
                    </MovingCard>
                ))}
            </span>
            {/* as wide as the cards, never wider, so MeldRow's sums hold */}
            <span className="w-0 min-w-full truncate text-xs text-muted-foreground short:hidden">{caption}</span>
            {target?.lit && (
                <span className="absolute -top-3 right-2 z-10 rounded-full bg-gold px-2 py-0.5 text-xs font-bold whitespace-nowrap text-gold-foreground short:-top-2.5 short:-right-2 short:py-px short:text-[11px]">
                    {target.label}
                </span>
            )}
        </button>
    );
    return (
        <Popover open={choice !== null} onOpenChange={(open) => { if (!open) onCancelChoice(); }}>
            <PopoverAnchor asChild>{meld}</PopoverAnchor>
            {choice && (
                <PopoverContent side={short ? "right" : "top"} aria-labelledby={titleId} className="short:p-3">
                    <EndChooser choice={choice} titleId={titleId} onChoose={onChoose} />
                </PopoverContent>
            )}
        </Popover>
    );
}

// Setruns side by side. Their cards shrink so the row fits its width, the way
// the hand's overlap does, so a row of setruns never wraps and pushes the
// table down. A setrun is as wide as its fan of cards (each card after the
// first adds --meld-strip of a card width, see .meld-fan) plus a 2px border
// and --meld-pad-x on each side; --meld-gap separates them. Wrapping is left
// on only for when the cards hit their smallest size.
function MeldRow({setruns, className, children}: {setruns: Setrun[]; className?: string; children: ReactNode}) {
    let overlapped = setruns.reduce((sum, setrun) => sum + setrun.cards.length - 1, 0);
    let cardWidths = setruns.length + " + var(--meld-strip) * " + overlapped;
    let fixed = setruns.length + " * (2 * var(--meld-pad-x) + 4px) + " + Math.max(setruns.length - 1, 0) + " * var(--meld-gap) + 2px";
    let fit = setruns.length
        ? {"--meld-w" : "max(26px, min(var(--meld-w-full), (100cqi - (" + fixed + ")) / (" + cardWidths + ")))"} as CSSProperties
        : undefined;
    return (
        <div className={cn("@container flex w-full flex-wrap gap-(--meld-gap)", className)} style={fit}>
            {children}
        </div>
    );
}

export default Meld;
export {MeldRow};
