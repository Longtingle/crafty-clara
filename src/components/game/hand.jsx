import {useState} from 'react';
import {DndContext, PointerSensor, closestCenter, useSensor, useSensors} from '@dnd-kit/core';
import {SortableContext, horizontalListSortingStrategy, useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {cn} from '@/lib/utils.js';
import {longName} from '@/engine/card-names.ts';
import {PlayingCard, MovingCard, CardTag} from './playing-card.jsx';
import {FLIGHT} from './cards.js';

// One card in the hand. The button is what dnd-kit drags; the MovingCard
// inside it is what Motion animates (lifting, sliding, flying to a pile).
function HandCard({card, index, order, isSelected, selectable, tag, playable, dealing, onDealt, onSelect}) {
    let {setNodeRef, listeners, transform, transition, isDragging} = useSortable({
        id : card.id,
        // Motion animates the card into its new slot after a drop
        animateLayoutChanges : () => false
    });
    return (
        <button
            ref={setNodeRef}
            type="button"
            {...listeners}
            aria-pressed={isSelected}
            aria-disabled={!selectable}
            aria-label={longName(card) + (tag ? " (" + tag.toLowerCase() + ")" : "")}
            onClick={() => onSelect(index)}
            style={{transform : CSS.Translate.toString(transform), transition}}
            className={cn(
                "group relative w-(--hand-w) flex-none touch-none rounded-[5%/3.3%] outline-none",
                isDragging && "z-40 cursor-grabbing",
                !selectable && !isDragging && "cursor-default"
            )}
        >
            <MovingCard
                id={card.id}
                // measure only when the hand changes, not while dnd-kit shifts cards around
                layoutDependency={order}
                initial={dealing ? {opacity : 0, y : -80, rotate : -8} : false}
                animate={{opacity : 1, y : isSelected ? "-17%" : 0, rotate : 0}}
                whileHover={selectable && !isSelected && !isDragging ? {y : "-6%"} : undefined}
                transition={dealing ? {...FLIGHT, delay : 0.1 + index * 0.045} : FLIGHT}
                onAnimationComplete={dealing ? onDealt : undefined}
                className={cn(
                    "rounded-[5%/3.3%] group-focus-visible:outline-3 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring",
                    isSelected
                        ? "shadow-[0_0_0_3px_var(--gold),0_16px_28px_rgb(0_0_0/0.5)]"
                        : "shadow-[0_6px_14px_rgb(0_0_0/0.35)]",
                    isDragging && "shadow-[0_18px_30px_rgb(0_0_0/0.55)]"
                )}
            >
                <PlayingCard card={card} alt="" className="w-full" />
                {tag && <CardTag>{tag}</CardTag>}
                {playable && !isSelected && (
                    <span aria-hidden="true" className="absolute -bottom-4 left-[14%] size-2.5 rounded-full bg-gold short:-bottom-3" />
                )}
            </MovingCard>
        </button>
    );
}

// The human's cards. Click to select; drag (mouse or touch) to reorder. Cards
// with a gold dot fit a setrun on the table; newCard ({id, label}) gets a tag.
// Mount a new Hand for each deal (give it a key) so the cards are dealt in.
function Hand({cards, selected, selectable, newCard, playable, onSelect, onReorder}) {
    // a small movement threshold, so a tap or click still selects
    let sensors = useSensors(useSensor(PointerSensor, {activationConstraint : {distance : 8}}));
    let ids = cards.map(card => card.id);
    let order = ids.join();

    // The cards a Hand mounts with are dealt in; cards that arrive later fly
    // in from wherever they came from instead.
    let [dealing, setDealing] = useState(true);

    let nameOf = (id) => longName(cards[ids.indexOf(id)]);
    let announcements = {
        onDragStart : ({active}) => "Picked up " + nameOf(active.id) + ".",
        onDragOver : ({active, over}) => over
            ? nameOf(active.id) + " is at position " + (ids.indexOf(over.id) + 1) + " of " + ids.length + "."
            : nameOf(active.id) + " is outside the hand.",
        onDragEnd : ({active, over}) => over
            ? nameOf(active.id) + " moved to position " + (ids.indexOf(over.id) + 1) + " of " + ids.length + "."
            : nameOf(active.id) + " put back.",
        onDragCancel : ({active}) => nameOf(active.id) + " put back."
    };

    let handleDragEnd = ({active, over}) => {
        if (!over || active.id === over.id) return;
        onReorder(ids.indexOf(active.id), ids.indexOf(over.id));
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            accessibility={{announcements}}
        >
            <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
                <div
                    role="group"
                    aria-label="Your hand"
                    className="hand-fan flex w-full justify-center pt-6 pb-4 short:pt-5 short:pb-3"
                    style={{"--n" : cards.length}}
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
                                dealing={dealing}
                                onDealt={() => setDealing(false)}
                                onSelect={onSelect}
                            />
                        );
                    })}
                </div>
            </SortableContext>
        </DndContext>
    );
}

export default Hand;
