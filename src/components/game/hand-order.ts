import {SET, RUN, type Card} from '@/engine/cards.ts';
import {sortHand} from '@/engine/setruns.ts';

/** How your hand is laid out: kept sorted by value or by suit, or in your own order. */
export type HandSort = "value" | "suit" | "own";

/**
 * Your cards in the order to show them. A sorted hand stays sorted as cards
 * come and go. In your own order, cards you've arranged (`order`, by id) keep
 * their places, and any others join on the right in the order you got them.
 */
export const orderHand = (hand: Card[], sort: HandSort, order: string[]): Card[] => {
    if (sort === "value") return sortHand(hand, SET);
    if (sort === "suit") return sortHand(hand, RUN);
    let byId = new Map(hand.map(card => [card.id, card]));
    let placed = order.filter(id => byId.has(id));
    let isPlaced = new Set(placed);
    return [...placed.map(id => byId.get(id)!), ...hand.filter(card => !isPlaced.has(card.id))];
};

/** The ids of a hand with one card moved, from one place to another. */
export const moveCard = (hand: Card[], from: number, to: number): string[] => {
    let ids = hand.map(card => card.id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    return ids;
};
