import {useState, type CSSProperties, type ReactNode} from 'react';
import {LayoutGroup} from 'motion/react';
import {Check, CircleAlert} from 'lucide-react';
import {cn} from '@/lib/utils.ts';
import {useShortScreen} from '@/lib/use-media-query.ts';
import {Button} from '@/components/ui/button.tsx';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog.tsx';
import type {Card, Requirement, Setrun} from '@/engine/cards.ts';
import {longName, setrunCaption, requirementText} from '@/engine/card-names.ts';
import {PlayingCard, MovingCard, CardTag} from './playing-card.tsx';
import {archPlace} from './arch.ts';
import {completes, finishedSlots, makeSlots, slotResult, span, usedIn, type GoDownSlot, type SetrunCheck, type SlotResult, type SlotSpec} from './go-down-slots.ts';

export type {GoDownSlot};

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
                            (start === from) ? "bg-cream text-cream-foreground" : "text-muted-foreground hover:text-foreground"
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
    result: SlotResult;
    /** on a phone: the status beside the title, the cards as tall as the slot allows, and no Clear */
    compact?: boolean;
    onActivate: () => void;
    onClear: () => void;
    onRemove: (index: number) => void;
    onLayout: (from: number) => void;
}

// A click anywhere in the box picks the slot, except on its cards and buttons,
// which do their own thing. The title button is the way in for the keyboard.
function Slot({slot, active, result, compact = false, onActivate, onClear, onRemove, onLayout}: SlotProps) {
    let {check, problem, cards, layouts} = result;
    let layoutChoice = (layouts.length > 1) && <LayoutChoice layouts={layouts} check={check} onChange={onLayout} />;
    return (
        <div
            onClick={(event) => {
                if (!(event.target as Element).closest("button")) onActivate();
            }}
            className={cn(
                "flex flex-col rounded-2xl border-2 bg-white/4",
                compact ? "min-w-0 gap-1.5 px-2.5 py-2" : "gap-2.5 p-3",
                check.valid ? "border-ok" : (cards.length > 0 ? "border-warn" : "border-white/18"),
                active
                    ? (compact ? "shadow-[0_0_0_4px_rgb(244_239_227/0.16)]" : "shadow-[0_0_0_5px_rgb(244_239_227/0.14)]")
                    : cn("cursor-pointer", !compact && "hover:bg-white/7")
            )}
        >
            <div className={cn("flex items-center", compact ? "min-w-0 gap-2" : "gap-2.5")}>
                <button
                    type="button"
                    aria-pressed={active}
                    onClick={onActivate}
                    className={cn(
                        "flex-none rounded-full border px-3 font-bold",
                        compact ? "h-8 text-[13px]" : "h-9 text-sm",
                        active ? "border-cream bg-cream text-cream-foreground" : cn("border-white/25", !compact && "hover:bg-white/10")
                    )}
                >
                    {slot.title}
                </button>
                {compact
                    ? (
                        <>
                            <span className={cn("min-w-0 flex-1 truncate text-[12.5px] font-bold", check.valid ? "text-ok" : (cards.length > 0 ? "text-warn" : "text-muted-foreground"))}>
                                {check.valid
                                    ? "✓ " + setrunCaption(check.setrun) + " is ready"
                                    : (cards.length > 0 ? problem : "Tap cards in your hand to add them")}
                            </span>
                            {layoutChoice}
                        </>
                    )
                    : (
                        <>
                            {active && <span className="text-[13px] text-muted-foreground">Adding cards here</span>}
                            <span className="flex-1" />
                            <Button variant="ghost" size="sm" disabled={cards.length === 0} onClick={onClear}>Clear</Button>
                        </>
                    )}
            </div>
            <div
                className={compact
                    ? "meld-fan flex min-h-0 flex-1 items-end [container-type:size]"
                    : "meld-fan flex min-h-[calc(var(--meld-w)*1.528+12px)] items-end pt-3 [--meld-w:64px]"}
                // on a phone the cards are as tall as the slot allows
                style={compact ? {"--meld-w" : "min(72px, calc(100cqh / 1.528))"} as CSSProperties : undefined}
            >
                {cards.length === 0 && (compact
                    ? <div className="size-full rounded-lg border-2 border-dashed border-white/18" />
                    : <div className="grid h-[calc(var(--meld-w)*1.528)] flex-1 place-items-center rounded-lg border-2 border-dashed border-white/18 text-sm text-muted-foreground">Empty</div>)}
                {cards.map(({card, index}) => (
                    <button
                        key={index}
                        type="button"
                        onClick={() => onRemove(index)}
                        aria-label={"Take " + longName(card) + " out of the " + slot.title.toLowerCase()}
                        className={cn("relative w-(--meld-w) flex-none", !compact && "transition-transform hover:-translate-y-1.5")}
                    >
                        <MovingCard id={card.id}>
                            <PlayingCard card={card} setrunType={check.valid ? slot.type : undefined} alt="" className="w-full" />
                        </MovingCard>
                    </button>
                ))}
            </div>
            {!compact && (
                <div className="flex items-center gap-3">
                    <p className={cn("flex flex-1 items-start gap-2 text-sm leading-snug", check.valid ? "text-ok" : "text-warn")}>
                        {check.valid
                            ? <Check className="mt-px size-4.5 flex-none" strokeWidth={3} aria-hidden="true" />
                            : <CircleAlert className="mt-px size-4.5 flex-none" aria-hidden="true" />}
                        {check.valid ? setrunCaption(check.setrun) + " is ready." : problem}
                    </p>
                    {layoutChoice}
                </div>
            )}
        </div>
    );
}

interface HandPickerProps {
    hand: Card[];
    /** the cards already in a slot, by hand index */
    used: Map<number, number>;
    /** whether a card would make the slot being filled a setrun */
    fits: (index: number) => boolean;
    /** the slot being filled */
    slotTitle: string;
    /** on a phone: in the same arch as at the table, along the bottom edge */
    arched?: boolean;
    onPick: (index: number) => void;
}

// Your hand, to pick cards from. A card in a slot leaves its place empty, so
// the rest stay put, and one that would finish the slot being filled says so.
function HandPicker({hand, used, fits, slotTitle, arched = false, onPick}: HandPickerProps) {
    let width = arched ? "w-(--hand-w)" : "w-[clamp(44px,5vw,64px)]";
    return (
        <div
            role="group"
            aria-label="Your hand"
            className={arched
                ? "hand-fan absolute inset-x-3 bottom-0 flex h-[calc(var(--hand-w)*1.05)] items-start justify-center"
                : "flex flex-wrap gap-1 pt-3"}
            style={arched ? {"--n" : hand.length} as CSSProperties : undefined}
        >
            {hand.map((card, index) => {
                if (used.has(index)) {
                    return <PlayingCard key={index} card={card} alt="" className={cn("invisible flex-none", width)} />;
                }
                let fitsHere = fits(index);
                let place = arched ? archPlace(index, hand.length) : null;
                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => onPick(index)}
                        aria-label={longName(card) + (fitsHere ? ", completes the " + slotTitle.toLowerCase() : "")}
                        style={place ? {marginTop : place.drop} : undefined}
                        className={cn("relative flex-none", width, !arched && "rounded-[5%/3.3%] transition-transform hover:-translate-y-1.5")}
                    >
                        {/* in the arch it leans from its bottom edge, which is off the screen;
                            Motion straightens it as it flies to a slot, and leans it as it comes back */}
                        <MovingCard
                            id={card.id}
                            style={place ? {rotate : place.angle} : undefined}
                            className={cn(
                                "rounded-[5%/3.3%]",
                                arched && "origin-bottom",
                                fitsHere
                                    ? "shadow-[0_0_0_3px_var(--gold),0_6px_14px_rgb(0_0_0/0.4)]"
                                    : (arched ? "shadow-[0_6px_14px_rgb(0_0_0/0.35)]" : "shadow-[0_4px_10px_rgb(0_0_0/0.35)]")
                            )}
                        >
                            <PlayingCard card={card} alt="" className="w-full" />
                            {fitsHere && (
                                <CardTag className={cn("bg-gold px-1.5 text-gold-foreground normal-case tracking-normal", arched ? "top-1 left-1" : "left-0.5")}>
                                    Fits
                                </CardTag>
                            )}
                        </MovingCard>
                    </button>
                );
            })}
        </div>
    );
}

interface GoDownBodyProps {
    hand: Card[];
    requirement: Requirement;
    onCancel: () => void;
    onSubmit: (slots: GoDownSlot[]) => void;
}

// The slots, the cards picked for each, and what they make (go-down-slots.ts).
function useSlots(hand: Card[], requirement: Requirement) {
    let slots = makeSlots(requirement);
    let [picks, setPicks] = useState<number[][]>(() => slots.map(() => []));
    // for each run that could be laid out more than one way, the value it's to start from
    let [froms, setFroms] = useState<(number | null)[]>(() => slots.map(() => null));
    let [active, setActive] = useState(0);

    let results = picks.map((indices, slotIndex) => slotResult(hand, slots[slotIndex].type, indices, froms[slotIndex]));
    let used = usedIn(picks);
    let readyCount = results.filter(result => result.check.valid).length;
    let setSlot = (slotIndex: number, indices: number[]) => setPicks(picks.map((old, i) => (i === slotIndex) ? indices : old));

    return {
        slots, results, used, readyCount, active,
        allReady : readyCount === slots.length,
        /** whether a card would make the slot being filled a setrun */
        fits : (index: number): boolean => !used.has(index) && completes(hand, slots[active].type, picks[active], index),
        /** puts a card from your hand into the slot being filled */
        pick : (index: number) => setSlot(active, [...picks[active], index]),
        finished : (): GoDownSlot[] => finishedSlots(slots, picks, results),
        /** what a slot shows, and what it does when clicked */
        slotProps : (slotIndex: number) => ({
            slot : slots[slotIndex],
            active : slotIndex === active,
            result : results[slotIndex],
            onActivate : () => setActive(slotIndex),
            onClear : () => setSlot(slotIndex, []),
            onRemove : (index: number) => setSlot(slotIndex, picks[slotIndex].filter(i => i !== index)),
            /** lays a run out the way that starts from this value */
            onLayout : (from: number) => setFroms(froms.map((old, i) => (i === slotIndex) ? from : old))
        })
    };
}

function GoDownBody({hand, requirement, onCancel, onSubmit}: GoDownBodyProps) {
    let {slots, used, readyCount, allReady, active, fits, pick, finished, slotProps} = useSlots(hand, requirement);

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-3xl">Go down</DialogTitle>
                <DialogDescription>
                    This round needs {requirementText(requirement)}. Pick a slot, then click cards in your hand to fill it.
                </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
                {slots.map((_, slotIndex) => <Slot key={slotIndex} {...slotProps(slotIndex)} />)}
            </div>

            <div className="flex flex-col gap-1">
                <h3 className="section-label text-[13px]">Your hand</h3>
                <HandPicker hand={hand} used={used} fits={fits} slotTitle={slots[active].title} onPick={pick} />
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
    let {slots, used, allReady, active, fits, pick, finished, slotProps} = useSlots(hand, requirement);

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
                {slots.map((_, slotIndex) => <Slot key={slotIndex} compact {...slotProps(slotIndex)} />)}
            </div>

            <HandPicker arched hand={hand} used={used} fits={fits} slotTitle={slots[active].title} onPick={pick} />
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
                        sheet
                        className="block overflow-clip p-0"
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
