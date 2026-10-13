// Shorthand for building cards in tests.

import {createCard, type Card, type Suit} from './cards.ts';

/** "10H" -> the Ten of hearts. Its id is the string, unless one is given. */
export const card = (str: string, id: string = str): Card =>
    createCard(parseInt(str.slice(0, -1)), str.slice(-1) as Suit, id);

/** "7C 7H 1D" -> three cards */
export const cards = (str: string): Card[] => str.split(" ").map(c => card(c));

export const names = (setrun: {cards: Card[]}): string[] => setrun.cards.map(c => c.displayString);
export const values = (setrun: {cards: Card[]}): number[] => setrun.cards.map(c => c.value);
