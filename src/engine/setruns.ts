import {SET, SUITS, asItself, asWild, isRedAce, isWild, type Card, type Setrun, type SetrunType} from './cards.ts';
import {SUIT_SYMBOL, rankName} from './card-names.ts';

// Red aces are wild. When one is used in a setrun as another card, its value
// and suit are set to that card's (asWild), and card.ace keeps what it really
// is. A red ace playing as itself is a natural card (isWild).

type CheckResult = {valid: true; setrun: Setrun} | {valid: false};
type AddResult = {valid: true; setrun: Setrun; returnedAce: Card | null} | {valid: false};

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

// Sorts for sets (by value) or for runs (by suit, then value).
const sortHand = <C extends Card>(hand: C[], type: SetrunType): C[] => {
    if (type === SET) return hand.toSorted((a, b) => a.value - b.value);
    return hand.toSorted((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.value - b.value);
};

const checkSet = (naturals: Card[], wilds: Card[]): Card[] | null => {
    if (naturals.length < 2 || naturals.length + wilds.length < 3) return null;
    let value = naturals[0].value;
    if (naturals.some(card => card.value !== value)) return null;
    return [...naturals, ...wilds.map(ace => asWild(ace, value, ace.ace!.suit))];
};

// Lays out a run from naturals with fixed values, filling gaps with wilds and
// putting any spare wilds below the run first, then above it.
const layOutRun = (naturals: Card[], wilds: Card[]): Card[] | null => {
    let sorted = naturals.toSorted((a, b) => a.value - b.value);
    let values = sorted.map(card => card.value);
    if (new Set(values).size !== values.length) return null;

    let min = values[0];
    let max = values[values.length - 1];
    let gaps = (max - min + 1) - values.length;
    if (gaps > wilds.length) return null;

    let spare = wilds.length - gaps;
    let start = Math.max(1, min - spare);
    let end = start + naturals.length + wilds.length - 1;
    if (end > 14) return null;

    let suit = sorted[0].suit;
    let remainingWilds = [...wilds];
    let cards: Card[] = [];
    for (let value = start; value <= end; value++) {
        let natural = sorted.find(card => card.value === value);
        cards.push(natural ?? asWild(remainingWilds.shift()!, value, suit));
    }
    return cards;
};

const checkRun = (naturals: Card[], wilds: Card[]): Card[] | null => {
    if (naturals.length < 3 || naturals.length + wilds.length < 4) return null;
    let suit = naturals[0].suit;
    if (naturals.some(card => card.suit !== suit)) return null;

    // an ace can be low (below a two) or high (above a king)
    let aces = naturals.filter(card => card.value === 1);
    let layouts = [naturals];
    if (aces.length > 0) {
        let highAce = aces[aces.length - 1];
        layouts.push(naturals.map(card => card === highAce ? {...card, value : 14} : card));
    }
    for (let layout of layouts) {
        let cards = layOutRun(layout, wilds);
        if (cards) return cards;
    }
    return null;
};

// Checks whether a group of cards makes a valid set (3+ of a value) or run
// (4+ in a row of one suit). Red aces are wild but can't outnumber the
// natural cards. Returns the setrun in order, with wild values assigned.
const checkSetrun = (cards: Card[], type: SetrunType): CheckResult => {
    for (let {naturals, wilds} of readings(cards, type)) {
        if (wilds.length > naturals.length) continue;
        let ordered = (type === SET) ? checkSet(naturals, wilds) : checkRun(naturals, wilds);
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

// Tries to add one card to a setrun already on the table. The natural card a
// wild stands in for replaces it, and the wild goes back to the hand.
// Otherwise the card has to extend the setrun: a red ace as itself if it can
// (onto a set of aces, or as the ace of its own suit's run), or else as a wild.
const addToSetrun = (setrun: Setrun, card: Card): AddResult => {
    let cards = setrun.cards;
    let first = cards[0];
    let last = cards[cards.length - 1];
    let result = (newCards: Card[]): AddResult => ({valid : true, setrun : {...setrun, cards : newCards}, returnedAce : null});

    // an ace is the natural for a wild standing in for a high ace too
    let replaced = cards.find(wild => isWild(wild) &&
        (wild.value === card.value || (card.value === 1 && wild.value === 14)) &&
        (setrun.type === SET || wild.suit === card.suit));
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
    } else if (card.suit === first.suit) {
        if (card.value === first.value - 1) return result([card, ...cards]);
        if (card.value === last.value + 1) return result([...cards, card]);
        if (card.value === 1 && last.value === 13) return result([...cards, {...card, value : 14}]);
        if (!isRedAce(card)) return {valid : false};
    } else if (!isRedAce(card)) {
        return {valid : false};
    }

    // a red ace that can't play as itself goes on as a wild, if there would
    // still be no more wilds than naturals
    let wilds = cards.filter(isWild).length + 1;
    if (wilds > cards.length + 1 - wilds) return {valid : false};
    if (setrun.type === SET) return result([...cards, asWild(card, first.value, card.ace!.suit)]);
    if (first.value > 1) return result([asWild(card, first.value - 1, first.suit), ...cards]);
    if (last.value < 14) return result([...cards, asWild(card, last.value + 1, first.suit)]);
    return {valid : false};
};

export {
    subsets,
    sortHand,
    checkSetrun,
    explainSetrun,
    addToSetrun
};
