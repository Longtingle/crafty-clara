import {RUN, SET, asItself, asWild, isRedAce, isWild, type Card, type Setrun, type SetrunType, type Suit} from './cards.ts';
import {SUIT_SYMBOL, rankName} from './card-names.ts';

// Red aces are wild. When one is used in a setrun as another card, its value
// and suit are set to that card's (asWild), and card.ace keeps what it really
// is. A red ace playing as itself is a natural card (isWild).

type CheckResult = {valid: true; setrun: Setrun} | {valid: false};
type AddResult = {valid: true; setrun: Setrun; returnedAce: Card | null} | {valid: false};

/** Where a card goes on a run: before its first card, or after its last. */
export type RunEnd = "low" | "high";

/** One way a card can extend a run: at that end, and the run it makes. */
export interface RunPlace {
    end: RunEnd;
    cards: Card[];
}

/** One way to play a group of cards: which are natural and which are wild. */
interface Reading {
    naturals: Card[];
    wilds: Card[];
}

// Every way of choosing some of the items, the biggest choices first.
const subsets = <T>(items: T[]): T[][] =>
    items.reduce<T[][]>((all, item) => [...all, ...all.map(subset => [...subset, item])], [[]])
        .sort((a, b) => b.length - a.length);

// The ways to read cards as naturals and wilds, most naturals first. A red
// ace is natural in a set of aces, and can be in a run of its own suit as its
// ace (or else be a wild somewhere else in the run). Any other red ace is wild.
const readings = (cards: Card[], type: SetrunType): Reading[] => {
    let redAces = cards.filter(isRedAce).map(asItself);
    let others = cards.filter(card => !isRedAce(card));
    if (type === SET) {
        let ofAces = others.every(card => card.value === 1);
        return [ofAces ? {naturals : [...others, ...redAces], wilds : []} : {naturals : others, wilds : redAces}];
    }
    let suit = others[0]?.suit;
    let ownSuit = redAces.filter(ace => ace.suit === suit);
    return subsets(ownSuit).map(asAces => ({
        naturals : [...others, ...asAces],
        wilds : redAces.filter(ace => !asAces.includes(ace))
    }));
};

// Suits in a sorted hand, alternating red and black.
const SUIT_ORDER: readonly Suit[] = ["H", "C", "D", "S"];

// Sorts for sets (by value, then suit) or for runs (by suit, then value).
const sortHand = <C extends Card>(hand: C[], type: SetrunType): C[] => {
    let bySuit = (a: C, b: C) => SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
    let byValue = (a: C, b: C) => a.value - b.value;
    return hand.toSorted((type === SET)
        ? (a, b) => byValue(a, b) || bySuit(a, b)
        : (a, b) => bySuit(a, b) || byValue(a, b));
};

const checkSet = (naturals: Card[], wilds: Card[]): Card[] | null => {
    if (naturals.length < 2 || naturals.length + wilds.length < 3) return null;
    let value = naturals[0].value;
    if (naturals.some(card => card.value !== value)) return null;
    return [...naturals, ...wilds.map(ace => asWild(ace, value, ace.ace!.suit))];
};

// The ways to lay out a run from naturals with fixed values: wilds fill the
// gaps, and any to spare go below the run or above it. Most below first.
const layOutRun = (naturals: Card[], wilds: Card[]): Card[][] => {
    let sorted = naturals.toSorted((a, b) => a.value - b.value);
    let values = sorted.map(card => card.value);
    if (new Set(values).size !== values.length) return [];

    let min = values[0];
    let max = values[values.length - 1];
    let gaps = (max - min + 1) - values.length;
    if (gaps > wilds.length) return [];

    let spare = wilds.length - gaps;
    let suit = sorted[0].suit;
    let layouts: Card[][] = [];
    for (let below = spare; below >= 0; below--) {
        let start = min - below;
        let end = max + spare - below;
        if (start < 1 || end > 14) continue;
        let remainingWilds = [...wilds];
        let cards: Card[] = [];
        for (let value = start; value <= end; value++) {
            let natural = sorted.find(card => card.value === value);
            cards.push(natural ?? asWild(remainingWilds.shift()!, value, suit));
        }
        layouts.push(cards);
    }
    return layouts;
};

// The ways to lay out a run, the ace low first.
const runLayoutsOf = (naturals: Card[], wilds: Card[]): Card[][] => {
    if (naturals.length < 3 || naturals.length + wilds.length < 4) return [];
    let suit = naturals[0].suit;
    if (naturals.some(card => card.suit !== suit)) return [];

    // an ace can be low (below a two) or high (above a king)
    let aces = naturals.filter(card => card.value === 1);
    let values = [naturals];
    if (aces.length > 0) {
        let highAce = aces[aces.length - 1];
        values.push(naturals.map(card => card === highAce ? {...card, value : 14} : card));
    }
    return values.flatMap(layout => layOutRun(layout, wilds));
};

/**
 * Every way to lay out cards as a run, each starting from a different value:
 * a red ace that can go at either end gives two. The first is the one
 * checkSetrun picks, with red aces as themselves where they can be, and any
 * spare wild below the run.
 */
const runLayouts = (cards: Card[]): Setrun[] => {
    let found = new Map<number, Setrun>();
    for (let {naturals, wilds} of readings(cards, RUN)) {
        if (wilds.length > naturals.length) continue;
        for (let layout of runLayoutsOf(naturals, wilds)) {
            if (!found.has(layout[0].value)) found.set(layout[0].value, {type : RUN, cards : layout});
        }
    }
    return [...found.values()];
};

// Checks whether a group of cards makes a valid set (3+ of a value) or run
// (4+ in a row of one suit). Red aces are wild but can't outnumber the
// natural cards. Returns the setrun in order, with wild values assigned. A
// run that could be laid out more than one way starts `from` that value, if
// given (see runLayouts).
const checkSetrun = (cards: Card[], type: SetrunType, from?: number): CheckResult => {
    for (let {naturals, wilds} of readings(cards, type)) {
        if (wilds.length > naturals.length) continue;
        let ordered = (type === SET)
            ? checkSet(naturals, wilds)
            : runLayoutsOf(naturals, wilds).find(layout => from === undefined || layout[0].value === from);
        if (ordered) return {valid : true, setrun : {type, cards : ordered}};
    }
    return {valid : false};
};

// The values missing from a run's natural cards, e.g. [5] for 3 4 6 7. With
// an ace, whichever of ace-low or ace-high leaves fewer gaps is used.
const runGaps = (naturals: Card[]): number[] => {
    let layouts = [naturals.map(card => card.value)];
    if (naturals.some(card => card.value === 1)) {
        layouts.push(naturals.map(card => card.value === 1 ? 14 : card.value));
    }
    let gapLists = layouts.map(values => {
        let gaps: number[] = [];
        for (let value = Math.min(...values); value <= Math.max(...values); value++) {
            if (!values.includes(value)) gaps.push(value);
        }
        return gaps;
    });
    return gapLists.reduce((fewest, gaps) => gaps.length < fewest.length ? gaps : fewest);
};

// Says why cards don't make a valid set or run yet, or returns null when
// checkSetrun would accept them. The go-down dialog shows this to the player.
const explainSetrun = (cards: Card[], type: SetrunType): string | null => {
    if (checkSetrun(cards, type).valid) return null;

    if (type === SET) {
        let {naturals, wilds} = readings(cards, SET)[0];
        if (cards.length === 0) return "Pick 3 or more cards of the same value.";
        if (naturals.some(card => card.value !== naturals[0].value)) return "Every card in a set must have the same value.";
        if (wilds.length > naturals.length) return "Wild aces can't outnumber natural cards.";
        if (cards.length < 3) return "A set needs at least 3 cards. Add " + (3 - cards.length) + " more.";
        return "These cards don't make a set.";
    }

    if (cards.length === 0) return "Pick 4 or more cards in a row, all the same suit.";
    let others = cards.filter(card => !isRedAce(card));
    if (others.some(card => card.suit !== others[0].suit)) return "Every card in a run must be the same suit.";

    // explain the reading that comes closest: wilds don't outnumber naturals,
    // then the fewest gaps left unfilled
    let gapsIn = (reading: Reading): number[] => (reading.naturals.length > 1) ? runGaps(reading.naturals) : [];
    let unfilled = (reading: Reading): number => Math.max(0, gapsIn(reading).length - reading.wilds.length);
    let outnumbered = (reading: Reading): number => (reading.wilds.length > reading.naturals.length) ? 1 : 0;
    let {naturals, wilds} = readings(cards, type).reduce((best, reading) =>
        (outnumbered(reading) - outnumbered(best) || unfilled(reading) - unfilled(best)) < 0 ? reading : best);

    if (wilds.length > naturals.length) return "Wild aces can't outnumber natural cards.";
    if (new Set(naturals.map(card => card.value)).size !== naturals.length) return "A run can't have two cards of the same value.";
    let gaps = gapsIn({naturals, wilds});
    if (gaps.length > wilds.length) {
        let missing = gaps.map(value => rankName(value) + SUIT_SYMBOL[naturals[0].suit]);
        return (missing.length === 1)
            ? "There's a gap. Add the " + missing[0] + " or a wild ace."
            : "There are gaps. Add the " + missing.join(" and ") + ", or wild aces in their place.";
    }
    if (cards.length < 4) return "A run needs at least 4 cards. Add " + (4 - cards.length) + " more.";
    if (naturals.length < 3) return "A run needs at least 3 natural cards.";
    return "These cards don't make a run.";
};

// The ends of a run a card can go on: as the next card down or up in its
// suit, an ace above a King, or else a red ace as a wild, if there would still
// be no more wilds than naturals. Low first. A red ace can often go at either
// end (as the 8♥ or as the A♥ on 9–K♥), and so, rarely, can a natural ace.
const runPlaces = (setrun: Setrun, card: Card): RunPlace[] => {
    let cards = setrun.cards;
    let first = cards[0];
    let last = cards[cards.length - 1];
    let suit = first.suit;
    let wilds = cards.filter(isWild).length + 1;
    let wildFits = isRedAce(card) && wilds <= cards.length + 1 - wilds;
    let places: RunPlace[] = [];

    if (card.suit === suit && card.value === first.value - 1) places.push({end : "low", cards : [card, ...cards]});
    else if (wildFits && first.value > 1) places.push({end : "low", cards : [asWild(card, first.value - 1, suit), ...cards]});

    if (card.suit === suit && card.value === last.value + 1) places.push({end : "high", cards : [...cards, card]});
    else if (card.suit === suit && card.value === 1 && last.value === 13) places.push({end : "high", cards : [...cards, {...card, value : 14}]});
    else if (wildFits && last.value < 14) places.push({end : "high", cards : [...cards, asWild(card, last.value + 1, suit)]});
    return places;
};

/** The ends of a run a card can extend it at, or none if it can't, or if it would replace a wild. */
const runEnds = (setrun: Setrun, card: Card): RunPlace[] =>
    (setrun.type !== RUN || replacedWild(setrun, card)) ? [] : runPlaces(setrun, card);

// The wild a natural card would replace: the card it stands in for (an ace
// for a wild high ace too).
const replacedWild = (setrun: Setrun, card: Card): Card | undefined => setrun.cards.find(wild => isWild(wild) &&
    (wild.value === card.value || (card.value === 1 && wild.value === 14)) &&
    (setrun.type === SET || wild.suit === card.suit));

// Tries to add one card to a setrun already on the table. The natural card a
// wild stands in for replaces it, and the wild goes back to the hand.
// Otherwise the card has to extend the setrun: a red ace as itself if it can
// (onto a set of aces, or as the ace of its own suit's run), or else as a wild.
// On a run, `end` says which end; left out, a card goes on as itself if it
// can, and at the low end if either will do.
const addToSetrun = (setrun: Setrun, card: Card, end?: RunEnd): AddResult => {
    let cards = setrun.cards;
    let first = cards[0];
    let result = (newCards: Card[]): AddResult => ({valid : true, setrun : {...setrun, cards : newCards}, returnedAce : null});

    let replaced = replacedWild(setrun, card);
    if (replaced) {
        return {
            valid : true,
            setrun : {...setrun, cards : cards.map(c => c === replaced ? {...card, value : replaced.value} : c)},
            returnedAce : asItself(replaced)
        };
    }

    if (setrun.type === SET) {
        if (card.value === first.value) return result([...cards, card]);
        if (!isRedAce(card)) return {valid : false};
        // a red ace that can't play as itself goes on as a wild, if there
        // would still be no more wilds than naturals
        let wilds = cards.filter(isWild).length + 1;
        if (wilds > cards.length + 1 - wilds) return {valid : false};
        return result([...cards, asWild(card, first.value, card.ace!.suit)]);
    }

    let places = runPlaces(setrun, card);
    let place = end
        ? places.find(place => place.end === end)
        : (places.find(place => !place.cards.some(placed => placed.id === card.id && isWild(placed))) ?? places[0]);
    return place ? result(place.cards) : {valid : false};
};

export {
    subsets,
    sortHand,
    checkSetrun,
    explainSetrun,
    addToSetrun,
    runEnds,
    runLayouts
};
