import {useEffect, useState, type ReactNode} from 'react';
import {
    DndContext, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors,
    type Announcements, type CollisionDetection, type UniqueIdentifier
} from '@dnd-kit/core';
import {longName, setrunCaption} from '@/engine/card-names.ts';
import {seatName} from './players.ts';
import {PlayedCard, parseTarget, type DropTarget} from './drop-targets.ts';
import {useTable} from './table-context.ts';

/** What dragging a card can do. GameScreen turns each into a command or a change to your hand. */
export interface DragActions {
    /** a card is being dragged (its place in your hand), or no longer is */
    drag(index: number | null): void;
    reorder(from: number, to: number): void;
    discard(): void;
    /** plays the card on a meld, and says whether it did (it may ask where on the meld first) */
    addToMeld(seat: number, index: number): boolean;
}

// How long a card played by a drop waits where it was dropped for its move to
// arrive (it comes back in a moment from the host in this page)
const PLAYED_MS = 1500;

// A pile or a meld under the pointer is the target; within the hand, the
// nearest card, so the hand can be reordered. Anywhere else, nothing: the card
// goes back.
const collisions: CollisionDetection = args => {
    let isCard = (id: UniqueIdentifier) => parseTarget(id) === null;
    let hits = pointerWithin({...args, droppableContainers : args.droppableContainers.filter(target => !isCard(target.id))});
    let target = hits.find(hit => parseTarget(hit.id)?.kind !== "hand") ?? hits[0];
    if (!target) return [];
    if (parseTarget(target.id)?.kind !== "hand") return [target];
    return closestCenter({...args, droppableContainers : args.droppableContainers.filter(card => isCard(card.id))});
};

// Dragging cards from your hand, with the mouse or by touch: within the hand
// to reorder it, onto the discard pile to discard, or onto a meld to add to
// it. While a card is dragged it counts as the selected card (in the table's
// `turn`), so the table lights up where it can go. Dropped anywhere it can't
// go, it goes back.
function TableDnd({children}: {children: ReactNode}) {
    let {view, hand, turn, actions} = useTable();
    // a small movement threshold, so a tap or click still selects
    let sensors = useSensors(useSensor(PointerSensor, {activationConstraint : {distance : 8}}));
    let ids = hand.map(card => card.id);
    let position = (id: UniqueIdentifier): number => ids.indexOf(String(id));
    let nameOf = (id: UniqueIdentifier): string => longName(hand[position(id)]);
    // the card just played by a drop, until its move has had time to arrive;
    // if the move is refused, the card goes back into the hand
    let [played, setPlayed] = useState<string | null>(null);
    useEffect(() => {
        if (played === null) return;
        let timer = setTimeout(() => setPlayed(null), PLAYED_MS);
        return () => clearTimeout(timer);
    }, [played]);

    // whether the card being dragged can go to a target
    let canDrop = (target: DropTarget): boolean => {
        if (target.kind === "discard") return turn.discardPile?.move === "discard";
        if (target.kind === "meld") return turn.targets[target.seat]?.[target.index] != null;
        return false;
    };
    let describe = (target: DropTarget): string => {
        if (target.kind === "discard") return "the discard pile";
        if (target.kind === "deck") return "the deck";
        if (target.kind === "meld") {
            let owner = seatName(view, target.seat);
            return ((owner === "You") ? "your " : owner + "'s ") + setrunCaption(view.seats[target.seat].table[target.index]);
        }
        return "your hand";
    };
    let where = (activeId: UniqueIdentifier, overId: UniqueIdentifier): string => {
        let target = parseTarget(overId);
        if (!target) return nameOf(activeId) + " is at position " + (position(overId) + 1) + " of " + ids.length + ".";
        return nameOf(activeId) + " is over " + describe(target) + "." + (canDrop(target) ? " Drop it to play it there." : "");
    };
    let announcements: Announcements = {
        onDragStart : ({active}) => "Picked up " + nameOf(active.id) + ".",
        onDragOver : ({active, over}) => over ? where(active.id, over.id) : nameOf(active.id) + " is outside the hand.",
        onDragEnd : ({active, over}) => {
            let target = over && parseTarget(over.id);
            if (!over || (target && !canDrop(target))) return nameOf(active.id) + " put back.";
            if (target) return nameOf(active.id) + " played on " + describe(target) + ".";
            return nameOf(active.id) + " moved to position " + (position(over.id) + 1) + " of " + ids.length + ".";
        },
        onDragCancel : ({active}) => nameOf(active.id) + " put back."
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisions}
            accessibility={{announcements}}
            onDragStart={({active}) => {
                setPlayed(null);
                actions.drag(position(active.id));
            }}
            onDragCancel={() => actions.drag(null)}
            onDragEnd={({active, over}) => {
                let target = over && parseTarget(over.id);
                if (target && target.kind === "discard" && canDrop(target)) {
                    setPlayed(String(active.id));
                    actions.discard();
                } else if (target && target.kind === "meld" && canDrop(target)) {
                    // a card asked where on the meld goes back to the hand meanwhile
                    if (actions.addToMeld(target.seat, target.index)) setPlayed(String(active.id));
                } else if (over && !target && active.id !== over.id) {
                    actions.reorder(position(active.id), position(over.id));
                }
                actions.drag(null);
            }}
        >
            <PlayedCard.Provider value={played}>{children}</PlayedCard.Provider>
        </DndContext>
    );
}

export default TableDnd;
