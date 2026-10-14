import {useContext, useState, type CSSProperties} from 'react';
import {useDndMonitor, useDroppable, type Translate} from '@dnd-kit/core';
import {SortableContext, horizontalListSortingStrategy, useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {cn} from '@/lib/utils.ts';
import type {Card} from '@/engine/cards.ts';
import {longName} from '@/engine/card-names.ts';
import {PlayingCard, MovingCard, CardTag} from './playing-card.tsx';
import {FLIGHT} from './cards.ts';
import type {NewCard} from './log-text.ts';
import {HAND_AREA, PlayedCard} from './drop-targets.ts';
import {archPlace, type ArchPlace} from './arch.ts';

interface HandCardProps {
    card: Card;
    index: number;
    /** the hand's card ids joined, which changes whenever a card moves */
    order: string;
    isSelected: boolean;
    selectable: boolean;
    tag: string | null;
    playable: boolean;
    /** where the card sits in the arch on a phone, or null in a straight row */
    place: ArchPlace | null;
    dealing: boolean;
    onDealt: () => void;
    onSelect: (index: number) => void;
}

// One card in the hand. The button is what dnd-kit drags; the MovingCard
// inside it is what Motion animates (lifting, sliding, flying to a pile).
function HandCard({card, index, order, isSelected, selectable, tag, playable, place, dealing, onDealt, onSelect}: HandCardProps) {
    let {setNodeRef, listeners, transform, transition, isDragging} = useSortable({
        id : card.id,
        // Motion animates the card into its new slot after a drop
        animateLayoutChanges : () => false
    });
    // dnd-kit only moves the dragged card while it's over the hand, so it
    // follows the pointer itself, out over the piles and melds too. Once
    // played by a drop, it stays where it was dropped until it flies off.
    let played = useContext(PlayedCard) === card.id;
    let [dragged, setDragged] = useState<Translate | null>(null);
    useDndMonitor({
        onDragStart : ({active}) => {
            if (active.id === card.id) setDragged(null);
        },
        onDragMove : ({active, delta}) => {
            if (active.id === card.id) setDragged(delta);
        }
    });
    let held = (isDragging || played) ? dragged : null;
    let moved = held ? {...held, scaleX : 1, scaleY : 1} : transform;
    return (
        <button
            ref={setNodeRef}
            type="button"
            {...listeners}
            aria-pressed={isSelected}
            aria-disabled={!selectable}
            aria-label={longName(card) + (tag ? " (" + tag.toLowerCase() + ")" : "")}
            onClick={() => onSelect(index)}
            style={{transform : CSS.Translate.toString(moved), transition : held ? undefined : transition, marginTop : place?.drop}}
            className={cn(
                "group relative w-(--hand-w) flex-none touch-none rounded-[5%/3.3%] outline-none",
                isDragging && "z-40 cursor-grabbing",
                !selectable && !isDragging && "cursor-default"
            )}
        >
            <MovingCard
                id={card.id}
                // measure only when the hand changes, not while dnd-kit shifts cards
                // around, and where a played card was dropped, so it flies from there
                layoutDependency={played ? order + ":played" : order}
                initial={dealing ? {opacity : 0, y : -80, rotate : -8} : false}
                // in the arch, a card leans from its bottom edge, which is off the screen
                animate={{opacity : 1, y : isSelected ? "-17%" : 0, rotate : (place && !held) ? place.angle : 0}}
                whileHover={selectable && !isSelected && !isDragging ? {y : "-6%"} : undefined}
                transition={dealing ? {...FLIGHT, delay : 0.1 + index * 0.045} : FLIGHT}
                onAnimationComplete={dealing ? onDealt : undefined}
                className={cn(
                    "rounded-[5%/3.3%] group-focus-visible:outline-3 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring",
                    place && "origin-bottom",
                    isSelected
                        ? "shadow-[0_0_0_3px_var(--gold),0_16px_28px_rgb(0_0_0/0.5)]"
                        : "shadow-[0_6px_14px_rgb(0_0_0/0.35)]",
                    isDragging && "shadow-[0_18px_30px_rgb(0_0_0/0.55)]"
                )}
            >
                <PlayingCard card={card} alt="" className="w-full" />
                {tag && <CardTag>{tag}</CardTag>}
                {playable && !isSelected && (
                    // the bottom of a card in the arch is off the screen, so its dot goes on top
                    <span aria-hidden="true" className={cn("absolute left-[14%] size-2.5 rounded-full bg-gold", place ? "-top-4" : "-bottom-4")} />
                )}
            </MovingCard>
        </button>
    );
}

interface HandProps {
    cards: Card[];
    /** index of the selected card */
    selected: number | null;
    selectable: boolean;
    newCard: NewCard | null;
    /** for each card: whether it fits a setrun on the table (a gold dot) */
    playable: boolean[];
    /** fan the cards in an arch along the bottom edge (on a phone) rather than in a row */
    arched?: boolean;
    onSelect: (index: number) => void;
}

// The human's cards. Click to select; drag (mouse or touch) to reorder them,
// or to play one on the table (TableDnd, around the whole table, handles the
// dragging). Cards with a gold dot fit a setrun on the table; newCard gets a tag.
// Mount a new Hand for each deal (give it a key) so the cards are dealt in.
function Hand({cards, selected, selectable, newCard, playable, arched = false, onSelect}: HandProps) {
    let ids = cards.map(card => card.id);
    let order = ids.join();
    // the hand is where a dragged card can be put back or moved along
    let {setNodeRef} = useDroppable({id : HAND_AREA});

    // The cards a Hand mounts with are dealt in; cards that arrive later fly
    // in from wherever they came from instead.
    let [dealing, setDealing] = useState(true);

    return (
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
            <div
                ref={setNodeRef}
                role="group"
                aria-label="Your hand"
                className={cn("hand-fan flex w-full justify-center", arched ? "h-full items-start" : "pt-6 pb-4")}
                style={{"--n" : cards.length} as CSSProperties}
            >
                {cards.map((card, index) => {
                    let isSelected = selected === index;
                    return (
                        <HandCard
                            key={card.id}
                            card={card}
                            index={index}
                            order={order}
                            isSelected={isSelected}
                            selectable={selectable}
                            tag={(newCard && newCard.id === card.id) ? newCard.label : null}
                            playable={playable[index]}
                            place={arched ? archPlace(index, cards.length) : null}
                            dealing={dealing}
                            onDealt={() => setDealing(false)}
                            onSelect={onSelect}
                        />
                    );
                })}
            </div>
        </SortableContext>
    );
}

export default Hand;
