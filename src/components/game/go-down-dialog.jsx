import {useState} from 'react';
import {Check, CircleAlert} from 'lucide-react';
import {cn} from '@/lib/utils.js';
import {Button} from '@/components/ui/button.jsx';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog.jsx';
import {SET, RUN} from '@/engine/cards.ts';
import {checkSetrun, explainSetrun} from '@/engine/setruns.ts';
import {longName, setrunCaption, requirementText} from '@/engine/card-names.ts';
import {PlayingCard, CardTag} from './playing-card.jsx';

// One slot per meld the round needs: sets first, then runs.
const makeSlots = (requirement) => [
    ...Array.from({length : requirement.S}, (_, i) => ({type : SET, title : (requirement.S > 1) ? "Set " + (i + 1) : "Set"})),
    ...Array.from({length : requirement.R}, (_, i) => ({type : RUN, title : (requirement.R > 1) ? "Run " + (i + 1) : "Run"}))
];

// The cards in a slot in display order, each with its hand index. A valid
// setrun is shown the way checkSetrun lays it out; wild aces in it are copies
// that share the original's card.ace object.
const slotCards = (hand, indices, check) => {
    if (!check.valid) {
        return [...indices].sort((a, b) => hand[a].value - hand[b].value).map(index => ({card : hand[index], index}));
    }
    return check.setrun.cards.map(card => ({
        card,
        index : indices.find(index => hand[index] === card || (hand[index].ace !== undefined && hand[index].ace === card.ace))
    }));
}

function Slot({slot, active, cards, check, problem, onActivate, onClear, onRemove}) {
    let valid = check.valid;
    return (
        <div className={cn(
            "flex flex-col gap-2.5 rounded-2xl border-2 bg-white/4 p-3",
            valid ? "border-ok" : (cards.length > 0 ? "border-warn" : "border-white/18"),
            active && "shadow-[0_0_0_5px_rgb(244_239_227/0.14)]"
        )}>
            <div className="flex items-center gap-2.5">
                <button
                    type="button"
                    aria-pressed={active}
                    onClick={onActivate}
                    className={cn(
                        "h-9 rounded-full border px-3 text-sm font-bold",
                        active ? "border-cream bg-cream text-[#12402a]" : "border-white/25 hover:bg-white/10"
                    )}
                >
                    {slot.title}
                </button>
                {active && <span className="text-[13px] text-muted-foreground">Adding cards here</span>}
                <span className="flex-1" />
                <Button variant="ghost" size="sm" disabled={cards.length === 0} onClick={onClear}>Clear</Button>
            </div>
            <div className="meld-fan flex min-h-[calc(var(--meld-w)*1.528+12px)] items-end pt-3 [--meld-w:64px]">
                {cards.length === 0
                    ? <div className="grid h-[calc(var(--meld-w)*1.528)] flex-1 place-items-center rounded-lg border-2 border-dashed border-white/18 text-sm text-muted-foreground">Empty</div>
                    : cards.map(({card, index}) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => onRemove(index)}
                            aria-label={"Take " + longName(card) + " out of the " + slot.title.toLowerCase()}
                            className="relative w-(--meld-w) flex-none transition-transform hover:-translate-y-1.5"
                        >
                            <PlayingCard card={card} setrunType={valid ? slot.type : undefined} alt="" className="w-full" />
                        </button>
                    ))}
            </div>
            <p className={cn("flex items-start gap-2 text-sm leading-snug", valid ? "text-ok" : "text-warn")}>
                {valid
                    ? <Check className="mt-px size-4.5 flex-none" strokeWidth={3} aria-hidden="true" />
                    : <CircleAlert className="mt-px size-4.5 flex-none" aria-hidden="true" />}
                {valid ? setrunCaption(check.setrun) + " is ready." : problem}
            </p>
        </div>
    );
}

function GoDownBody({hand, requirement, onCancel, onSubmit}) {
    let slots = makeSlots(requirement);
    let [picks, setPicks] = useState(() => slots.map(() => []));
    let [active, setActive] = useState(0);

    let results = picks.map((indices, slotIndex) => {
        let cards = indices.map(index => hand[index]);
        let check = checkSetrun(cards, slots[slotIndex].type);
        return {
            check,
            problem : check.valid ? null : explainSetrun(cards, slots[slotIndex].type),
            cards : slotCards(hand, indices, check)
        };
    });
    let usedIn = new Map();
    picks.forEach((indices, slotIndex) => indices.forEach(index => usedIn.set(index, slotIndex)));
    let readyCount = results.filter(result => result.check.valid).length;
    let allReady = readyCount === slots.length;

    // cards that would complete the slot being filled
    let activeCards = picks[active].map(index => hand[index]);
    let fits = (index) => !results[active].check.valid && !usedIn.has(index) &&
        checkSetrun([...activeCards, hand[index]], slots[active].type).valid;

    let setSlot = (slotIndex, indices) => setPicks(picks.map((old, i) => (i === slotIndex) ? indices : old));

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-3xl">Go down</DialogTitle>
                <DialogDescription>
                    This round needs {requirementText(requirement)}. Pick a slot, then click cards in your hand to fill it.
                </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
                {slots.map((slot, slotIndex) => (
                    <Slot
                        key={slotIndex}
                        slot={slot}
                        active={slotIndex === active}
                        cards={results[slotIndex].cards}
                        check={results[slotIndex].check}
                        problem={results[slotIndex].problem}
                        onActivate={() => setActive(slotIndex)}
                        onClear={() => setSlot(slotIndex, [])}
                        onRemove={(index) => setSlot(slotIndex, picks[slotIndex].filter(i => i !== index))}
                    />
                ))}
            </div>

            <div className="flex flex-col gap-1">
                <h3 className="text-[13px] font-bold tracking-widest text-muted-foreground uppercase">Your hand</h3>
                <div className="flex flex-wrap gap-1 pt-3">
                    {hand.map((card, index) => {
                        let slotIndex = usedIn.get(index);
                        let used = slotIndex !== undefined;
                        let fitsHere = fits(index);
                        return (
                            <button
                                key={index}
                                type="button"
                                disabled={used}
                                onClick={() => setSlot(active, [...picks[active], index])}
                                aria-label={longName(card) + (used ? ", in " + slots[slotIndex].title.toLowerCase() : (fitsHere ? ", completes the " + slots[active].title.toLowerCase() : ""))}
                                className={cn(
                                    "relative w-[clamp(44px,5vw,64px)] flex-none rounded-[5%/3.3%] transition-transform enabled:hover:-translate-y-1.5",
                                    used && "opacity-35",
                                    fitsHere ? "shadow-[0_0_0_3px_var(--gold),0_6px_14px_rgb(0_0_0/0.4)]" : "shadow-[0_4px_10px_rgb(0_0_0/0.35)]"
                                )}
                            >
                                <PlayingCard card={card} alt="" className="w-full" />
                                {used && <CardTag className="left-0.5 bg-white/85 px-1.5 normal-case tracking-normal">{slots[slotIndex].title}</CardTag>}
                                {fitsHere && <CardTag className="left-0.5 bg-gold px-1.5 text-gold-foreground normal-case tracking-normal">Fits</CardTag>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <DialogFooter className="border-t border-white/10 pt-4">
                <span className="text-muted-foreground sm:mr-auto">
                    {allReady ? "All ready." : readyCount + " of " + slots.length + " ready. Finish them all to go down."}
                </span>
                <Button variant="outline" size="lg" onClick={onCancel}>Cancel</Button>
                <Button size="lg" disabled={!allReady} onClick={() => onSubmit(picks.map((indices, i) => ({type : slots[i].type, indices})))}>
                    Go down
                </Button>
            </DialogFooter>
        </>
    );
}

// Lay down the round's melds. Checks each slot as cards go in and says what's
// missing; Go down only works once every slot is valid.
function GoDownDialog({open, hand, requirement, onCancel, onSubmit}) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[960px]">
                {open && <GoDownBody hand={hand} requirement={requirement} onCancel={onCancel} onSubmit={onSubmit} />}
            </DialogContent>
        </Dialog>
    );
}

export default GoDownDialog;
