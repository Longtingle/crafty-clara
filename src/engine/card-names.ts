import {SET, isWild, type Card, type Requirement, type Setrun, type SetrunType, type Suit} from './cards.ts';

const RANK: Record<number, string> = {1 : "A", 11 : "J", 12 : "Q", 13 : "K", 14 : "A"};
const RANK_WORD: Record<number, string> = {
    1 : "Ace", 2 : "Two", 3 : "Three", 4 : "Four", 5 : "Five", 6 : "Six", 7 : "Seven",
    8 : "Eight", 9 : "Nine", 10 : "Ten", 11 : "Jack", 12 : "Queen", 13 : "King", 14 : "Ace"
};
const RANK_PLURAL: Record<number, string> = {1 : "Aces", 11 : "Jacks", 12 : "Queens", 13 : "Kings", 14 : "Aces"};
const SUIT_SYMBOL: Record<Suit, string> = {C : "♣", D : "♦", H : "♥", S : "♠"};
const SUIT_WORD: Record<Suit, string> = {C : "clubs", D : "diamonds", H : "hearts", S : "spades"};

// An ace keeps its real identity in card.ace, even when it is a wild or
// ace-high copy whose value and suit have been changed inside a setrun.
const identity = (card: Card): {value: number; suit: Suit} => card.ace ?? card;

const rankName = (value: number): string => RANK[value] ?? String(value);

// "7♦", "A♥"
const shortName = (card: Card): string => {
    let {value, suit} = identity(card);
    return rankName(value) + SUIT_SYMBOL[suit];
};

// "Seven of diamonds", for alt text and screen readers
const longName = (card: Card): string => {
    let {value, suit} = identity(card);
    return RANK_WORD[value] + " of " + SUIT_WORD[suit];
};

// What a wild stands in for: "K" in a set, "5♦" in a run.
const standInName = (card: Card, type: SetrunType): string =>
    rankName(card.value) + (type === SET ? "" : SUIT_SYMBOL[card.suit]);

// "Set of 9s", "Set of Kings", "Run 3–6 ♦"
const setrunCaption = (setrun: Setrun): string => {
    let cards = setrun.cards;
    if (setrun.type === SET) {
        let value = (cards.find(card => !isWild(card)) ?? cards[0]).value;
        return "Set of " + (RANK_PLURAL[value] ?? value + "s");
    }
    let first = cards[0];
    let last = cards[cards.length - 1];
    return "Run " + rankName(first.value) + "–" + rankName(last.value) + " " + SUIT_SYMBOL[first.suit];
};

const plural = (count: number, word: string): string => count + " " + word + (count === 1 ? "" : "s");

// {S : 1, R : 1} -> "1 set + 1 run"
const requirementText = (requirement: Requirement): string => [
    requirement.S > 0 ? plural(requirement.S, "set") : null,
    requirement.R > 0 ? plural(requirement.R, "run") : null
].filter(Boolean).join(" + ");

export {
    SUIT_SYMBOL,
    rankName,
    shortName,
    longName,
    standInName,
    setrunCaption,
    requirementText,
    plural
};
