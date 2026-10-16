// The go-down dialog's slots, one for each setrun the round needs, and what
// the cards picked for each make: with no React, so it's tested on its own.

import {SET, RUN, type Card, type Requirement, type Setrun, type SetrunType} from '@/engine/cards.ts';
import {checkSetrun, explainSetrun, runLayouts} from '@/engine/setruns.ts';
import {setrunCaption} from '@/engine/card-names.ts';

/** A finished setrun from the dialog: its type and its cards, as indices into your hand. */
export interface GoDownSlot {
    type: SetrunType;
    indices: number[];
    /** for a run that could be laid out more than one way, the value it starts from */
    from?: number;
}

export interface SlotSpec {
    type: SetrunType;
    title: string;
}

export type SetrunCheck = ReturnType<typeof checkSetrun>;

/** What the cards picked for a slot make. */
export interface SlotResult {
    check: SetrunCheck;
    /** why the cards aren't a valid setrun yet */
    problem: string | null;
    /** the cards in display order, each with its hand index */
    cards: {card: Card; index: number}[];
    /** the ways a run could be laid out, when there's more than one */
    layouts: Setrun[];
}

/** One slot per setrun the round needs: sets first, then runs. */
export const makeSlots = (requirement: Requirement): SlotSpec[] => [
    ...Array.from({length : requirement.S}, (_, i): SlotSpec => ({type : SET, title : (requirement.S > 1) ? "Set " + (i + 1) : "Set"})),
    ...Array.from({length : requirement.R}, (_, i): SlotSpec => ({type : RUN, title : (requirement.R > 1) ? "Run " + (i + 1) : "Run"}))
];

// The cards in a slot in display order, each with its hand index. A valid
// setrun is shown the way it's laid out, with wild aces as copies of the
// cards in your hand, so they're matched up by id.
const slotCards = (hand: Card[], indices: number[], check: SetrunCheck): {card: Card; index: number}[] => {
    if (!check.valid) {
        return [...indices].sort((a, b) => hand[a].value - hand[b].value).map(index => ({card : hand[index], index}));
    }
    return check.setrun.cards.map(card => ({card, index : indices.find(index => hand[index].id === card.id)!}));
};

/**
 * What the cards picked for a slot make. A run that could be laid out more
 * than one way (a red ace at either end) goes the way that starts from
 * `from`, or else the way checkSetrun lays it out.
 */
export const slotResult = (hand: Card[], type: SetrunType, indices: number[], from: number | null = null): SlotResult => {
    let cards = indices.map(index => hand[index]);
    let layouts = (type === RUN) ? runLayouts(cards) : [];
    let chosen = layouts.find(layout => layout.cards[0].value === from) ?? layouts[0];
    let check: SetrunCheck = (type === RUN)
        ? (chosen ? {valid : true, setrun : chosen} : {valid : false})
        : checkSetrun(cards, type);
    return {
        check,
        problem : explainSetrun(cards, type),
        cards : slotCards(hand, indices, check),
        layouts : (layouts.length > 1) ? layouts : []
    };
};

/** Which slot each card of your hand is in, by hand index. */
export const usedIn = (picks: number[][]): Map<number, number> => {
    let used = new Map<number, number>();
    picks.forEach((indices, slotIndex) => indices.forEach(index => used.set(index, slotIndex)));
    return used;
};

/** Whether a card from your hand would make a slot's cards a setrun, which they aren't yet. */
export const completes = (hand: Card[], type: SetrunType, indices: number[], index: number): boolean => {
    let cards = indices.map(i => hand[i]);
    return !indices.includes(index) && !checkSetrun(cards, type).valid && checkSetrun([...cards, hand[index]], type).valid;
};

/** The setruns to go down with, once every slot is ready. */
export const finishedSlots = (slots: SlotSpec[], picks: number[][], results: SlotResult[]): GoDownSlot[] =>
    picks.map((indices, i) => {
        let {check, layouts} = results[i];
        return (check.valid && layouts.length > 1)
            ? {type : slots[i].type, indices, from : check.setrun.cards[0].value}
            : {type : slots[i].type, indices};
    });

/** "8–K ♥": the values a run goes between. */
export const span = (run: Setrun): string => setrunCaption(run).replace(/^Run /, "");
