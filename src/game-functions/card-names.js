import {SET} from '../store/constants.js';

const RANK = {1 : "A", 11 : "J", 12 : "Q", 13 : "K", 14 : "A"};
const RANK_WORD = {
    1 : "Ace", 2 : "Two", 3 : "Three", 4 : "Four", 5 : "Five", 6 : "Six", 7 : "Seven",
    8 : "Eight", 9 : "Nine", 10 : "Ten", 11 : "Jack", 12 : "Queen", 13 : "King", 14 : "Ace"
};
const RANK_PLURAL = {1 : "Aces", 11 : "Jacks", 12 : "Queens", 13 : "Kings", 14 : "Aces"};
const SUIT_SYMBOL = {C : "♣", D : "♦", H : "♥", S : "♠"};
const SUIT_WORD = {C : "clubs", D : "diamonds", H : "hearts", S : "spades"};

// An ace keeps its real identity in card.ace, even when it is a wild or
// ace-high copy whose value and suit have been changed inside a setrun.
const identity = (card) => card.ace ?? card;

const rankName = (value) => RANK[value] ?? String(value);

// "7♦", "A♥"
const shortName = (card) => {
    let {value, suit} = identity(card);
    return rankName(value) + SUIT_SYMBOL[suit];
}

// "Seven of diamonds", for alt text and screen readers
const longName = (card) => {
    let {value, suit} = identity(card);
    return RANK_WORD[value] + " of " + SUIT_WORD[suit];
}

// A red ace in a setrun standing in for some other card.
const isStandIn = (card) => card.ace !== undefined && card.ace.colour === "red" &&
    !(card.value === card.ace.value && card.suit === card.ace.suit);

// What a wild stands in for: "K" in a set, "5♦" in a run.
const standInName = (card, type) => rankName(card.value) + (type === SET ? "" : SUIT_SYMBOL[card.suit]);

// "Set of 9s", "Set of Kings", "Run 3–6 ♦"
const setrunCaption = (setrun) => {
    let cards = setrun.cards;
    if (setrun.type === SET) {
        let value = (cards.find(card => !isStandIn(card)) ?? cards[0]).value;
        return "Set of " + (RANK_PLURAL[value] ?? value + "s");
    }
    let first = cards[0];
    let last = cards[cards.length - 1];
    return "Run " + rankName(first.value) + "–" + rankName(last.value) + " " + SUIT_SYMBOL[first.suit];
}

const plural = (count, word) => count + " " + word + (count === 1 ? "" : "s");

// {S : 1, R : 1} -> "1 set + 1 run"
const requirementText = (requirement) => [
    requirement.S > 0 ? plural(requirement.S, "set") : null,
    requirement.R > 0 ? plural(requirement.R, "run") : null
].filter(Boolean).join(" + ");

export {
    SUIT_SYMBOL,
    rankName,
    shortName,
    longName,
    isStandIn,
    standInName,
    setrunCaption,
    requirementText,
    plural
};
