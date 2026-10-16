import {useEffect, useState} from 'react';
import {AnimatePresence, m} from 'motion/react';
import {useDroppable} from '@dnd-kit/core';
import {cn} from '@/lib/utils.ts';
import {Button} from '@/components/ui/button.tsx';
import type {Card} from '@/engine/cards.ts';
import {longName, shortName} from '@/engine/card-names.ts';
import {PlayingCard, MovingCard, CardBack, CardTag} from './playing-card.tsx';
import {DECK_PILE, DISCARD_PILE} from './drop-targets.ts';

/** What clicking the discard pile does, while it does something. */
export interface PileAction {
    move: "take" | "discard";
    /** the tag on the pile */
    chip: string;
    /** for screen readers */
    label: string;
    onClick: () => void;
}

/** The discard on offer while you can claim it. */
export interface ClaimOffer {
    card: Card;
    /** ms left to answer when the offer arrived */
    closesIn: number;
    onClaim: () => void;
    onPass: () => void;
}

// The time left of `ms`, counted down a second at a time, standing still
// while paused.
function useCountdown(ms: number, paused: boolean): number {
    let [left, setLeft] = useState(ms);
    useEffect(() => {
        if (paused || left <= 0) return;
        let timer = setTimeout(() => setLeft(Math.max(0, left - (left % 1000 || 1000))), left % 1000 || 1000);
        return () => clearTimeout(timer);
    }, [left, paused]);
    return left;
}

// Claim or pass on the top discard. The claim button counts down the time
// left from when it mounts, a second at a time (not smoothly: a phone would
// repaint it every frame); later views don't restart it, and it stops while
// the game is paused. It sits beside the discard pile so the table doesn't
// move when it appears.
function ClaimChoice({card, closesIn, paused, onClaim, onPass}: ClaimOffer & {paused: boolean}) {
    let [duration] = useState(closesIn);
    let left = useCountdown(duration, paused);
    return (
        <div className="flex items-center gap-1 rounded-2xl bg-card p-1 shadow-lg ring-1 ring-border">
            <button
                type="button"
                onClick={onClaim}
                className="flex h-11 items-center gap-2 rounded-xl bg-gold pr-4 pl-1.5 font-bold whitespace-nowrap text-gold-foreground hover:bg-gold/85"
            >
                <svg viewBox="0 0 36 36" className="size-8 -rotate-90" aria-hidden="true">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
                    <circle
                        cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                        pathLength="100" strokeDasharray="100" strokeDashoffset={100 - 100 * left / duration}
                    />
                </svg>
                Claim {shortName(card)}
            </button>
            <Button variant="ghost" onClick={onPass} aria-label={"Pass on " + longName(card)}>
                Pass
            </Button>
        </div>
    );
}

interface PilesProps {
    /** the id of the deck's top card, which is all the view gives */
    deckTopId: string | null;
    deckCount: number;
    deckActive: boolean;
    onDeckClick: () => void;
    /** top card first */
    discard: Card[];
    discardAction: PileAction | null;
    claim: ClaimOffer | null;
    /** whether the game is paused, which stops the claim countdown */
    paused: boolean;
}

// The deck and the discard pile. A pile glows when clicking it does
// something.
//
// On a phone they're stacked, overhanging the right edge of the screen, so
// their tags sit inside the part that shows, or beside the pile.
//
// The deck's top card and the top two discards are MovingCards, so cards fly
// out of and onto the piles. A card on a pile stays where it is, so Motion
// measures it only as it arrives and leaves (layoutDependency). When a card leaves, AnimatePresence keeps it
// long enough to cross-fade into what it becomes (a face in your hand, a back
// in an opponent's). The second discard sits under the top one, so the pile
// isn't empty while a card is in the air.
// A pile's tag sits centred on its top edge, or on a phone, at the bottom of
// the part of the pile that shows (a short tag), or beside the pile (a long one).
const tagCentred = "left-1/2 -translate-x-1/2 short:translate-x-0";
const tagInside = "short:top-auto short:bottom-2 short:left-1 short:px-1.5 short:text-[10px] short:tracking-wide";
const tagBeside = "short:top-auto short:bottom-[18%] short:right-[calc(100%+6px)] short:left-auto";

function Piles({deckTopId, deckCount, deckActive, onDeckClick, discard, discardAction, claim, paused}: PilesProps) {
    let discardTop = discard[0];
    // a card dragged from your hand can be dropped on the discard pile, and is
    // turned away from the deck
    let {setNodeRef : deckRef} = useDroppable({id : DECK_PILE});
    let {setNodeRef : pileRef, isOver : overPile} = useDroppable({id : DISCARD_PILE});
    return (
        <div className="flex items-start gap-8 short:flex-col short:gap-2">
            <div className="flex flex-col items-center gap-3">
                <button
                    ref={deckRef}
                    type="button"
                    disabled={!deckActive}
                    onClick={onDeckClick}
                    aria-label={"Deck, " + deckCount + " cards" + (deckActive ? ". Draw a card" : "")}
                    className={cn(
                        "relative w-(--pile-w) rounded-[7%/4.6%] shadow-[3px_3px_0_#e4dcc9,6px_6px_0_#cbbf9f,0_12px_24px_rgb(0_0_0/0.4)]",
                        deckActive && "pulse-gold"
                    )}
                >
                    <CardBack className="w-full" />
                    <AnimatePresence initial={false}>
                        {deckTopId && (
                            <MovingCard key={deckTopId} id={deckTopId} layoutDependency={deckTopId} className="absolute inset-0">
                                <CardBack className="size-full" />
                            </MovingCard>
                        )}
                    </AnimatePresence>
                    <span className="absolute top-1 left-1 z-10 hidden rounded-full bg-black/55 px-1.5 text-[11px] font-bold text-cream short:block">
                        {deckCount}
                    </span>
                    {deckActive && <CardTag className={cn(tagCentred, tagInside, "bg-gold text-gold-foreground")}>Draw</CardTag>}
                </button>
                <span className="text-[13px] text-muted-foreground short:hidden">Deck · {deckCount} left</span>
            </div>
            <div className="relative flex flex-col items-center gap-3">
                <AnimatePresence>
                    {claim && (
                        <div
                            key={claim.card.id}
                            className="absolute top-[calc(var(--pile-w)*0.764)] left-full z-40 ml-4 -translate-y-1/2 short:right-full short:left-auto short:mr-3 short:ml-0"
                        >
                            <m.div
                                initial={{opacity : 0, scale : 0.8, x : -12}}
                                animate={{opacity : 1, scale : 1, x : 0}}
                                exit={{opacity : 0, scale : 0.9}}
                                transition={{type : "spring", duration : 0.35, bounce : 0.3}}
                            >
                                <ClaimChoice {...claim} paused={paused} />
                            </m.div>
                        </div>
                    )}
                </AnimatePresence>
                <button
                    ref={pileRef}
                    type="button"
                    disabled={!discardAction}
                    onClick={discardAction?.onClick}
                    aria-label={discardAction
                        ? discardAction.label
                        : "Discard pile" + (discardTop ? ", " + longName(discardTop) + " on top" : ", empty")}
                    className={cn(
                        "relative w-(--pile-w) rounded-[5%/3.3%] shadow-[0_12px_24px_rgb(0_0_0/0.4)] transition-transform",
                        discardAction && "pulse-gold",
                        discardAction && overPile && "scale-105"
                    )}
                >
                    <span className="block card-face w-full rounded-[7%/4.6%] border-2 border-dashed border-white/25" />
                    <AnimatePresence initial={false}>
                        {discard.slice(0, 2).reverse().map(card => (
                            <MovingCard key={card.id} id={card.id} layoutDependency={card.id} className="absolute inset-0">
                                <PlayingCard card={card} alt="" className="w-full" />
                            </MovingCard>
                        ))}
                    </AnimatePresence>
                    {discardAction && (
                        <CardTag className={cn(tagCentred, (discardAction.move === "take") ? tagInside : tagBeside, "bg-gold text-gold-foreground")}>
                            {discardAction.chip}
                        </CardTag>
                    )}
                </button>
                <span className="text-[13px] text-muted-foreground short:hidden">Discard pile</span>
            </div>
        </div>
    );
}

export default Piles;
