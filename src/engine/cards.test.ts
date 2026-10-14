// @vitest-environment node
import {asWild, createCard, getPoints, isRedAce, isWild} from './cards.ts';
import {random, shuffle} from './random.ts';
import {card, cards} from './testing.ts';

describe('createCard', () => {
    it('builds a card with a display string', () => {
        expect(createCard(10, "H", "x")).toEqual({value : 10, suit : "H", displayString : "10H", id : "x"});
    });

    it('marks aces with their colour, and red aces are wild', () => {
        expect(card("1D").ace).toEqual({value : 1, suit : "D", colour : "red"});
        expect(card("1S").ace).toEqual({value : 1, suit : "S", colour : "black"});
        expect(cards("1H 1D 1C 13H").map(isRedAce)).toEqual([true, true, false, false]);
    });
});

describe('isWild', () => {
    it('is a red ace standing in for another card, not one playing as itself', () => {
        expect(isWild(asWild(card("1H"), 7, "C"))).toBe(true);
        expect(isWild(asWild(card("1D"), 1, "H"))).toBe(true);
        expect(isWild(card("1H"))).toBe(false);
        expect(isWild({...card("1D"), value : 14})).toBe(false);
        expect(isWild(asWild(card("1S"), 7, "C"))).toBe(false);
    });
});

describe('getPoints', () => {
    it('scores aces 25, tens and faces 10, others face value', () => {
        expect(getPoints(cards("1C 10H 13S 7D"))).toBe(25 + 10 + 10 + 7);
        expect(getPoints([])).toBe(0);
    });
});

describe('random', () => {
    it('gives the same numbers from the same seed', () => {
        const a = {rng : 42};
        const b = {rng : 42};
        const first = [random(a), random(a), random(a)];
        expect([random(b), random(b), random(b)]).toEqual(first);
        first.forEach(n => expect(n >= 0 && n < 1).toBe(true));
        expect(random({rng : 43})).not.toBe(first[0]);
    });

    it('shuffles into a permutation', () => {
        const items = Array.from({length : 20}, (_, i) => i);
        const shuffled = shuffle({rng : 7}, [...items]);
        expect(shuffled).not.toEqual(items);
        expect(shuffled.toSorted((x, y) => x - y)).toEqual(items);
    });
});
