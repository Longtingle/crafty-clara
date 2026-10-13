// Cards, setruns and round requirements: the words the rest of the engine
// is written in. The engine uses no browser APIs, so it can run on a server.

export type Suit = "C" | "D" | "H" | "S";

export const SUITS: readonly Suit[] = ["C", "D", "H", "S"];

export interface Card {
    /** 1–13, or 14 for an ace above a king in a run */
    value: number;
    suit: Suit;
    /** the real card, also its image name: "10H", aces "1S", J/Q/K "11C"–"13C" */
    displayString: string;
    /** unique within a game, says nothing about the card, and stays with it wherever it goes */
    id: string;
    /** set on aces: what the card really is, even when a setrun changes its value and suit */
    ace?: {value: 1; suit: Suit; colour: "red" | "black"};
}

export const SET = "SET";
export const RUN = "RUN";
export type SetrunType = typeof SET | typeof RUN;

/** A meld: 3+ cards of one value (a set) or 4+ in a row of one suit (a run), runs in order. */
export interface Setrun {
    type: SetrunType;
    cards: Card[];
}

/** How many sets (S) and runs (R) a player must lay down to go down. */
export interface Requirement {
    S: number;
    R: number;
}

export const ROUND_REQUIREMENTS: readonly Requirement[] = [
    {S : 2, R : 0},
    {S : 1, R : 1},
    {S : 0, R : 2},
    {S : 3, R : 0},
    {S : 2, R : 1},
    {S : 1, R : 2},
    {S : 0, R : 3}
];

export const createCard = (value: number, suit: Suit, id: string): Card => {
    let card: Card = {value, suit, displayString : value + suit, id};
    if (value === 1) {
        card.ace = {value : 1, suit, colour : (suit === "C" || suit === "S") ? "black" : "red"};
    }
    return card;
};

/** Red aces (1H, 1D) are wild. */
export const isRedAce = (card: Card): boolean => card.ace?.colour === "red";

/** What the cards left in a hand cost at the end of a round: aces 25, 10 to King 10, others face value. */
export const getPoints = (hand: Card[]): number => hand.reduce((sum, card) => {
    if (card.value === 1) return sum + 25;
    return sum + Math.min(card.value, 10);
}, 0);
