import {SET, SUITS, isRedAce, type Card, type Setrun, type SetrunType, type Suit} from './cards.ts';
import {SUIT_SYMBOL, rankName} from './card-names.ts';

// Red aces are wild. When one is used in a setrun its value and suit are set
// to the card it stands in for, and card.ace keeps what it really is.
const asWild = (ace: Card, value: number, suit: Suit): Card => ({...ace, value, suit});

type CheckResult = {valid: true; setrun: Setrun} | {valid: false};
type AddResult = {valid: true; setrun: Setrun; returnedAce: Card | null} | {valid: false};

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
    let wilds = cards.filter(isRedAce);
    let naturals = cards.filter(card => !isRedAce(card));
    if (wilds.length > naturals.length) return {valid : false};

    let ordered = (type === SET) ? checkSet(naturals, wilds) : checkRun(naturals, wilds);
    if (ordered === null) return {valid : false};
    return {
        valid : true,
        setrun : {type, cards : ordered}
    };
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
    let wilds = cards.filter(isRedAce);
    let naturals = cards.filter(card => !isRedAce(card));

    if (type === SET) {
        if (cards.length === 0) return "Pick 3 or more cards of the same value.";
        if (naturals.some(card => card.value !== naturals[0].value)) return "Every card in a set must have the same value.";
        if (wilds.length > naturals.length) return "Wild aces can't outnumber natural cards.";
        if (cards.length < 3) return "A set needs at least 3 cards. Add " + (3 - cards.length) + " more.";
        return null;
    }

    if (cards.length === 0) return "Pick 4 or more cards in a row, all the same suit.";
    if (naturals.some(card => card.suit !== naturals[0].suit)) return "Every card in a run must be the same suit.";
    if (wilds.length > naturals.length) return "Wild aces can't outnumber natural cards.";
    if (new Set(naturals.map(card => card.value)).size !== naturals.length) return "A run can't have two cards of the same value.";

    let gaps = (naturals.length > 1) ? runGaps(naturals) : [];
    if (gaps.length > wilds.length) {
        let missing = gaps.map(value => rankName(value) + SUIT_SYMBOL[naturals[0].suit]);
        return (missing.length === 1)
            ? "There's a gap. Add the " + missing[0] + " or a wild ace."
            : "There are gaps. Add the " + missing.join(" and ") + ", or wild aces in their place.";
    }
    if (cards.length < 4) return "A run needs at least 4 cards. Add " + (4 - cards.length) + " more.";
    if (naturals.length < 3) return "A run needs at least 3 natural cards.";
    if (checkRun(naturals, wilds)) return null;
    return "These cards don't make a run.";
};

// Tries to add one card to a setrun already on the table. A natural card
// matching a red ace's stand-in value replaces it and the ace is returned to
// the hand; otherwise the card has to extend the setrun.
const addToSetrun = (setrun: Setrun, card: Card): AddResult => {
    let cards = setrun.cards;
    let result = (newCards: Card[]): AddResult => ({valid : true, setrun : {...setrun, cards : newCards}, returnedAce : null});

    if (isRedAce(card)) {
        let wildCount = cards.filter(isRedAce).length + 1;
        if (wildCount > cards.length + 1 - wildCount) return {valid : false};
        if (setrun.type === SET) return result([...cards, asWild(card, cards[0].value, card.ace!.suit)]);
        let first = cards[0];
        let last = cards[cards.length - 1];
        if (first.value > 1) return result([asWild(card, first.value - 1, first.suit), ...cards]);
        if (last.value < 14) return result([...cards, asWild(card, last.value + 1, first.suit)]);
        return {valid : false};
    }

    let replaced = cards.find(wild => isRedAce(wild) &&
        wild.value === card.value && (setrun.type === SET || wild.suit === card.suit));
    if (replaced) {
        return {
            valid : true,
            setrun : {...setrun, cards : cards.map(c => c === replaced ? card : c)},
            returnedAce : {...replaced, value : 1, suit : replaced.ace!.suit}
        };
    }

    if (setrun.type === SET) {
        return (card.value === cards[0].value) ? result([...cards, card]) : {valid : false};
    }

    let first = cards[0];
    let last = cards[cards.length - 1];
    if (card.suit !== first.suit) return {valid : false};
    if (card.value === first.value - 1) return result([card, ...cards]);
    if (card.value === last.value + 1) return result([...cards, card]);
    if (card.value === 1 && last.value === 13) return result([...cards, {...card, value : 14}]);
    return {valid : false};
};

export {
    sortHand,
    checkSetrun,
    explainSetrun,
    addToSetrun
};
