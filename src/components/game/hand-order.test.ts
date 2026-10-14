// @vitest-environment node
import {cards} from '@/engine/testing.ts';
import {moveCard, orderHand} from './hand-order.ts';

const names = (hand: {displayString: string}[]) => hand.map(card => card.displayString);

describe('orderHand', () => {
    const hand = cards("9S 2H 13D 9C");

    it('keeps a sorted hand sorted, whatever order the cards came in', () => {
        expect(names(orderHand(hand, "value", []))).toEqual(["2H", "9C", "9S", "13D"]);
        expect(names(orderHand(hand.toReversed(), "value", []))).toEqual(["2H", "9C", "9S", "13D"]);
        expect(names(orderHand(hand, "suit", []))).toEqual(["2H", "9C", "13D", "9S"]);
    });

    it('keeps your own order, with new cards on the right', () => {
        const order = ["13D", "9S", "2H", "9C"]; // ids from cards() are the display strings
        expect(names(orderHand(hand, "own", order))).toEqual(order);

        const drawn = [...hand, ...cards("5C")];
        expect(names(orderHand(drawn, "own", order))).toEqual([...order, "5C"]);

        const played = hand.filter(card => card.id !== "9S");
        expect(names(orderHand(played, "own", order))).toEqual(["13D", "2H", "9C"]);
    });
});

describe('moveCard', () => {
    it('moves a card to a new place', () => {
        const hand = cards("2H 9C 9S 13D");
        expect(moveCard(hand, 0, 2)).toEqual(["9C", "9S", "2H", "13D"]);
        expect(moveCard(hand, 3, 0)).toEqual(["13D", "2H", "9C", "9S"]);
    });
});
