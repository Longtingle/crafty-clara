import {cn} from '@/lib/utils.js';
import {longName} from '@/game-functions/card-names.js';
import {PlayingCard, CardTag} from './playing-card.jsx';

// The human's cards. Click to select, drag to reorder. Cards with a gold dot
// fit a setrun on the table; newCard ({displayString, label}) gets a tag.
function Hand({cards, selected, selectable, newCard, playable, onSelect, onReorder}) {
    let taggedIndex = newCard ? cards.findIndex(card => card.displayString === newCard.displayString) : -1;

    return (
        <div
            role="group"
            aria-label="Your hand"
            className="hand-fan flex w-full justify-center pt-6 pb-4 short:pt-5 short:pb-3"
            style={{"--n" : cards.length}}
        >
            {cards.map((card, index) => {
                let isSelected = selected === index;
                let tag = (index === taggedIndex) ? newCard.label : null;
                return (
                    <button
                        key={card.displayString + "-" + index}
                        type="button"
                        aria-pressed={isSelected}
                        aria-disabled={!selectable}
                        aria-label={longName(card) + (tag ? " (" + tag.toLowerCase() + ")" : "")}
                        onClick={() => onSelect(index)}
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                            event.preventDefault();
                            onReorder(Number(event.dataTransfer.getData("text/plain")), index);
                        }}
                        className={cn(
                            "relative w-(--hand-w) flex-none rounded-[5%/3.3%] transition-[translate,box-shadow] duration-150",
                            isSelected
                                ? "-translate-y-6 shadow-[0_0_0_3px_var(--gold),0_16px_28px_rgb(0_0_0/0.5)] short:-translate-y-4"
                                : "shadow-[0_6px_14px_rgb(0_0_0/0.35)]",
                            selectable && !isSelected && "hover:-translate-y-2",
                            !selectable && "cursor-default"
                        )}
                    >
                        <PlayingCard card={card} alt="" className="w-full" />
                        {tag && <CardTag>{tag}</CardTag>}
                        {playable[index] && !isSelected && (
                            <span aria-hidden="true" className="absolute -bottom-4 left-[14%] size-2.5 rounded-full bg-gold short:-bottom-3" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default Hand;
