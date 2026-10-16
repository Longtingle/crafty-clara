import {useState, type CSSProperties, type ReactNode} from 'react';
import {LayoutGroup} from 'motion/react';
import {Check, CircleAlert} from 'lucide-react';
import {cn} from '@/lib/utils.ts';
import {useShortScreen} from '@/lib/use-media-query.ts';
import {Button} from '@/components/ui/button.tsx';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog.tsx';
import {SET, RUN, type Card, type Requirement, type Setrun, type SetrunType} from '@/engine/cards.ts';
import {checkSetrun, explainSetrun, runLayouts} from '@/engine/setruns.ts';
import {longName, setrunCaption, requirementText} from '@/engine/card-names.ts';
import {PlayingCard, MovingCard, CardTag} from './playing-card.tsx';
import {archPlace} from './arch.ts';

/** A finished setrun from the dialog: its type and its cards, as indices into your hand. */
export interface GoDownSlot {
    type: SetrunType;
    indices: number[];
    /** for a run that could be laid out more than one way, the value it starts from */
    from?: number;
}

interface SlotSpec {
    type: SetrunType;
    title: string;
}

type SetrunCheck = ReturnType<typeof checkSetrun>;

// One slot per meld the round needs: sets first, then runs.
const makeSlots = (requirement: Requirement): SlotSpec[] => [
    ...Array.from({length : requirement.S}, (_, i): SlotSpec => ({type : SET, title : (requirement.S > 1) ? "Set " + (i + 1) : "Set"})),
    ...Array.from({length : requirement.R}, (_, i): SlotSpec => ({type : RUN, title : (requirement.R > 1) ? "Run " + (i + 1) : "Run"}))
];

// The cards in a slot in display order, each with its hand index. A valid
// setrun is shown the way checkSetrun lays it out, with wild aces as copies
// of the cards in your hand, so they're matched up by id.
const slotCards = (hand: Card[], indices: number[], check: SetrunCheck): {card: Card; index: number}[] => {
    if (!check.valid) {
        return [...indices].sort((a, b) => hand[a].value - hand[b].value).map(index => ({card : hand[index], index}));
    }
    return check.setrun.cards.map(card => ({card, index : indices.find(index => hand[index].id === card.id)!}));
}

// "8–K ♥": the values a run goes between
const span = (run: Setrun): string => setrunCaption(run).replace(/^Run /, "");

interface LayoutChoiceProps {
    /** the ways the run could go, more than one */
    layouts: Setrun[];
    check: SetrunCheck;
    onChange: (from: number) => void;
    className?: string;
}

// A run that could be laid out more than one way, with a red ace at one end
// or the other: which, by the values it would go between.
function LayoutChoice({layouts, check, onChange, className}: LayoutChoiceProps) {
    let from = check.valid ? check.setrun.cards[0].value : null;
    return (
        <div role="group" aria-label="Lay the run out as" className={cn("flex flex-none rounded-full bg-black/25 p-0.5", className)}>
            {layouts.map(layout => {
                let start = layout.cards[0].value;
                return (
                    <button
                        key={start}
                        type="button"
                        aria-pressed={start === from}
                        onClick={() => onChange(start)}
                        className={cn(
                            "h-8 rounded-full px-3 text-[13px] font-bold whitespace-nowrap",
                            (start === from) ? "bg-cream text-[#12402a]" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {span(layout)}
                    </button>
                );
            })}
        </div>
    );
}

interface SlotProps {
    slot: SlotSpec;
    active: boolean;
    cards: {card: Card; index: number}[];
    check: SetrunCheck;
    /** why the cards aren't a valid setrun yet */
    problem: string | null;
    /** the ways a run could be laid out, when there's more than one */
    layouts: Setrun[];
    onActivate: () => void;
    onClear: () => void;
    onRemove: (index: number) => void;
    onLayout: (from: number) => void;
}

// A click anywhere in the box picks the slot, except on its cards and buttons,
// which do their own thing. The title button is the way in for the keyboard.
function Slot({slot, active, cards, check, problem, layouts, onActivate, onClear, onRemove, onLayout}: SlotProps) {
    return (
        <div
            onClick={(event) => {
                if (!(event.target as Element).closest("button")) onActivate();
            }}
            className={cn(
                "flex flex-col gap-2.5 rounded-2xl border-2 bg-white/4 p-3",
                check.valid ? "border-ok" : (cards.length > 0 ? "border-warn" : "border-white/18"),
                active ? "shadow-[0_0_0_5px_rgb(244_239_227/0.14)]" : "cursor-pointer hover:bg-white/7"
            )}
        >
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
                            <MovingCard id={card.id}>
                                <PlayingCard card={card} setrunType={check.valid ? slot.type : undefined} alt="" className="w-full" />
                            </MovingCard>
                        </button>
                    ))}
            </div>
            <div className="flex items-center gap-3">
                <p className={cn("flex flex-1 items-start gap-2 text-sm leading-snug", check.valid ? "text-ok" : "text-warn")}>
                    {check.valid
                        ? <Check className="mt-px size-4.5 flex-none" strokeWidth={3} aria-hidden="true" />
                        : <CircleAlert className="mt-px size-4.5 flex-none" aria-hidden="true" />}
                    {check.valid ? setrunCaption(check.setrun) + " is ready." : problem}
                </p>
                {layouts.length > 1 && <LayoutChoice layouts={layouts} check={check} onChange={onLayout} />}
            </div>
        </div>
    );
}

interface GoDownBodyProps {
    hand: Card[];
    requirement: Requirement;
    onCancel: () => void;
    onSubmit: (slots: GoDownSlot[]) => void;
}

// The slots, the cards picked for each, and whether each is a valid setrun
// yet. A run that could be laid out more than one way (a red ace at either
// end) goes the way chosen for it (`froms`), or else the way checkSetrun
// lays it out.
function useSlots(hand: Card[], requirement: Requirement) {
    let slots = makeSlots(requirement);
    let [picks, setPicks] = useState<number[][]>(() => slots.map(() => []));
    let [froms, setFroms] = useState<(number | null)[]>(() => slots.map(() => null));
    let [active, setActive] = useState(0);

    let results = picks.map((indices, slotIndex) => {
        let cards = indices.map(index => hand[index]);
        let type = slots[slotIndex].type;
        let layouts = (type === RUN) ? runLayouts(cards) : [];
        let chosen = layouts.find(layout => layout.cards[0].value === froms[slotIndex]) ?? layouts[0];
        let check: SetrunCheck = (type === RUN)
            ? (chosen ? {valid : true, setrun : chosen} : {valid : false})
            : checkSetrun(cards, type);
        return {
            check,
            problem : explainSetrun(cards, type),
            cards : slotCards(hand, indices, check),
            layouts : (layouts.length > 1) ? layouts : []
        };
    });
    let usedIn = new Map<number, number>();
    picks.forEach((indices, slotIndex) => indices.forEach(index => usedIn.set(index, slotIndex)));
    let readyCount = results.filter(result => result.check.valid).length;

    // cards that would complete the slot being filled
    let activeCards = picks[active].map(index => hand[index]);
    let fits = (index: number): boolean => !results[active].check.valid && !usedIn.has(index) &&
        checkSetrun([...activeCards, hand[index]], slots[active].type).valid;

    let setSlot = (slotIndex: number, indices: number[]) => setPicks(picks.map((old, i) => (i === slotIndex) ? indices : old));

    return {
        slots, picks, results, usedIn, readyCount, fits, setSlot, active, setActive,
        allReady : readyCount === slots.length,
        /** puts a card from your hand into the slot being filled */
        pick : (index: number) => setSlot(active, [...picks[active], index]),
        /** lays a run out the way that starts from this value */
        setLayout : (slotIndex: number, from: number) => setFroms(froms.map((old, i) => (i === slotIndex) ? from : old)),
        finished : (): GoDownSlot[] => picks.map((indices, i) => {
            let {check, layouts} = results[i];
            return (check.valid && layouts.length > 1)
                ? {type : slots[i].type, indices, from : check.setrun.cards[0].value}
                : {type : slots[i].type, indices};
        })
    };
}

function GoDownBody({hand, requirement, onCancel, onSubmit}: GoDownBodyProps) {
    let {slots, picks, results, usedIn, readyCount, allReady, fits, setSlot, active, setActive, pick, setLayout, finished} = useSlots(hand, requirement);

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
                        layouts={results[slotIndex].layouts}
                        onActivate={() => setActive(slotIndex)}
                        onClear={() => setSlot(slotIndex, [])}
                        onRemove={(index) => setSlot(slotIndex, picks[slotIndex].filter(i => i !== index))}
                        onLayout={(from) => setLayout(slotIndex, from)}
                    />
                ))}
            </div>

            <div className="flex flex-col gap-1">
                <h3 className="text-[13px] font-bold tracking-widest text-muted-foreground uppercase">Your hand</h3>
                <div className="flex flex-wrap gap-1 pt-3">
                    {hand.map((card, index) => {
                        if (usedIn.has(index)) {
                            // a card in a slot leaves its place empty, so the rest stay put
                            return <PlayingCard key={index} card={card} alt="" className="invisible w-[clamp(44px,5vw,64px)] flex-none" />;
                        }
                        let fitsHere = fits(index);
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => pick(index)}
                                aria-label={longName(card) + (fitsHere ? ", completes the " + slots[active].title.toLowerCase() : "")}
                                className="relative w-[clamp(44px,5vw,64px)] flex-none rounded-[5%/3.3%] transition-transform hover:-translate-y-1.5"
                            >
                                <MovingCard
                                    id={card.id}
                                    className={cn(
                                        "rounded-[5%/3.3%]",
                                        fitsHere ? "shadow-[0_0_0_3px_var(--gold),0_6px_14px_rgb(0_0_0/0.4)]" : "shadow-[0_4px_10px_rgb(0_0_0/0.35)]"
                                    )}
                                >
                                    <PlayingCard card={card} alt="" className="w-full" />
                                    {fitsHere && <CardTag className="left-0.5 bg-gold px-1.5 text-gold-foreground normal-case tracking-normal">Fits</CardTag>}
                                </MovingCard>
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
                <Button size="lg" disabled={!allReady} onClick={() => onSubmit(finished())}>
                    Go down
                </Button>
            </DialogFooter>
        </>
    );
}

// On a phone, going down takes the whole screen: the slots across the top and
// your hand along the bottom, in the same arch as at the table. Tap a slot,
// then tap cards to fill it; tap a card in a slot to take it out.
function GoDownSheet({hand, requirement, onCancel, onSubmit}: GoDownBodyProps) {
    let {slots, picks, results, usedIn, allReady, fits, setSlot, active, setActive, pick, setLayout, finished} = useSlots(hand, requirement);

    return (
        <div className="flex h-full flex-col">
            <header className="flex h-13 flex-none items-center gap-2.5 border-b border-white/10 pr-2 pl-4">
                <DialogTitle className="text-[22px]">Go down</DialogTitle>
                <DialogDescription className="truncate text-[13px]">
                    Round needs {requirementText(requirement)}
                </DialogDescription>
                <span className="flex-1" />
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button disabled={!allReady} onClick={() => onSubmit(finished())}>Go down</Button>
            </header>

            <div
                className="grid min-h-0 flex-1 gap-2.5 px-3 pt-2.5 pb-[calc(var(--hand-w)*1.05+12px)]"
                style={{gridTemplateColumns : `repeat(${slots.length}, minmax(0, 1fr))`}}
            >
                {slots.map((slot, slotIndex) => {
                    let {check, problem, cards, layouts} = results[slotIndex];
                    let isActive = slotIndex === active;
                    return (
                        <div
                            key={slotIndex}
                            onClick={(event) => {
                                if (!(event.target as Element).closest("button")) setActive(slotIndex);
                            }}
                            className={cn(
                                "flex min-w-0 flex-col gap-1.5 rounded-2xl border-2 bg-white/4 px-2.5 py-2",
                                check.valid ? "border-ok" : (cards.length > 0 ? "border-warn" : "border-white/18"),
                                isActive ? "shadow-[0_0_0_4px_rgb(244_239_227/0.16)]" : "cursor-pointer"
                            )}
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <button
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => setActive(slotIndex)}
                                    className={cn(
                                        "h-8 flex-none rounded-full border px-3 text-[13px] font-bold",
                                        isActive ? "border-cream bg-cream text-[#12402a]" : "border-white/25"
                                    )}
                                >
                                    {slot.title}
                                </button>
                                <span className={cn("min-w-0 flex-1 truncate text-[12.5px] font-bold", check.valid ? "text-ok" : (cards.length > 0 ? "text-warn" : "text-muted-foreground"))}>
                                    {check.valid
                                        ? "✓ " + setrunCaption(check.setrun) + " is ready"
                                        : (cards.length > 0 ? problem : "Tap cards in your hand to add them")}
                                </span>
                                {layouts.length > 1 && <LayoutChoice layouts={layouts} check={check} onChange={(from) => setLayout(slotIndex, from)} />}
                            </div>
                            {/* the cards are as tall as the slot allows */}
                            <div
                                className="meld-fan flex min-h-0 flex-1 items-end [container-type:size]"
                                style={{"--meld-w" : "min(72px, calc(100cqh / 1.528))"} as CSSProperties}
                            >
                                {cards.length === 0
                                    ? <div className="size-full rounded-lg border-2 border-dashed border-white/18" />
                                    : cards.map(({card, index}) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => setSlot(slotIndex, picks[slotIndex].filter(i => i !== index))}
                                            aria-label={"Take " + longName(card) + " out of " + slot.title.toLowerCase()}
                                            className="relative w-(--meld-w) flex-none"
                                        >
                                            <MovingCard id={card.id}>
                                                <PlayingCard card={card} setrunType={check.valid ? slot.type : undefined} alt="" className="w-full" />
                                            </MovingCard>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div
                role="group"
                aria-label="Your hand"
                className="hand-fan absolute inset-x-3 bottom-0 flex h-[calc(var(--hand-w)*1.05)] items-start justify-center"
                style={{"--n" : hand.length} as CSSProperties}
            >
                {hand.map((card, index) => {
                    if (usedIn.has(index)) {
                        // a card in a slot leaves its place empty, so the rest stay put
                        return <PlayingCard key={index} card={card} alt="" className="invisible w-(--hand-w) flex-none" />;
                    }
                    let fitsHere = fits(index);
                    let place = archPlace(index, hand.length);
                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => pick(index)}
                            aria-label={longName(card) + (fitsHere ? ", completes " + slots[active].title.toLowerCase() : "")}
                            style={{marginTop : place.drop}}
                            className="relative w-(--hand-w) flex-none"
                        >
                            {/* it leans from its bottom edge, which is off the screen; Motion
                                straightens it as it flies to a slot, and leans it as it comes back */}
                            <MovingCard
                                id={card.id}
                                style={{rotate : place.angle}}
                                className={cn(
                                    "origin-bottom rounded-[5%/3.3%]",
                                    fitsHere ? "shadow-[0_0_0_3px_var(--gold),0_6px_14px_rgb(0_0_0/0.4)]" : "shadow-[0_6px_14px_rgb(0_0_0/0.35)]"
                                )}
                            >
                                <PlayingCard card={card} alt="" className="w-full" />
                                {fitsHere && <CardTag className="top-1 left-1 bg-gold px-1.5 text-gold-foreground normal-case tracking-normal">Fits</CardTag>}
                            </MovingCard>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

interface GoDownDialogProps extends GoDownBodyProps {
    open: boolean;
}

let openings = 0;

// Cards fly between your hand and the slots (MovingCard). Each time the dialog
// opens, its cards' flights get names of their own: apart from the table's,
// which share the cards' ids, and from the last time it was open, which Motion
// would otherwise fly them from.
function Flights({children}: {children: ReactNode}) {
    let [id] = useState(() => "go-down-" + ++openings);
    return <LayoutGroup id={id}>{children}</LayoutGroup>;
}

// Lay down the round's melds. Checks each slot as cards go in and says what's
// missing; Go down only works once every slot is valid. On a phone (a short
// screen) it's a sheet that fills the screen.
function GoDownDialog({open, hand, requirement, onCancel, onSubmit}: GoDownDialogProps) {
    let short = useShortScreen();
    let props = {hand, requirement, onCancel, onSubmit};
    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
            {short
                ? (
                    <DialogContent
                        showCloseButton={false}
                        className="top-0 left-0 block h-dvh max-w-none translate-x-0 translate-y-0 overflow-clip rounded-none bg-card p-0 ring-0 sm:max-w-none"
                    >
                        {open && <Flights><GoDownSheet {...props} /></Flights>}
                    </DialogContent>
                )
                : (
                    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[960px]">
                        {open && <Flights><GoDownBody {...props} /></Flights>}
                    </DialogContent>
                )}
        </Dialog>
    );
}

export default GoDownDialog;
