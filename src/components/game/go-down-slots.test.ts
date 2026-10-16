// @vitest-environment node
import {RUN, SET} from '@/engine/cards.ts';
import {cards} from '@/engine/testing.ts';
import {completes, finishedSlots, makeSlots, slotResult, span, usedIn} from './go-down-slots.ts';

const titles = (S: number, R: number) => makeSlots({S, R}).map(slot => slot.title);

it('makes a slot for each setrun the round needs, sets first, numbered when there are more than one', () => {
    expect(titles(2, 0)).toEqual(["Set 1", "Set 2"]);
    expect(titles(1, 1)).toEqual(["Set", "Run"]);
    expect(titles(1, 2)).toEqual(["Set", "Run 1", "Run 2"]);
    expect(makeSlots({S : 1, R : 1}).map(slot => slot.type)).toEqual([SET, RUN]);
});

describe('slotResult', () => {
    const hand = cards("9H 7C 8H 1D 10H 7S 7D 11H 12H 13H");

    it('says why cards are not a setrun yet, and shows them by value', () => {
        const result = slotResult(hand, SET, [4, 1]);
        expect(result.check.valid).toBe(false);
        expect(result.problem).not.toBeNull();
        expect(result.cards.map(({index}) => index)).toEqual([1, 4]);
    });

    it('shows a setrun the way it is laid out, with each card’s place in your hand', () => {
        const result = slotResult(hand, RUN, [4, 0, 3, 2]);
        expect(result.check.valid).toBe(true);
        expect(result.problem).toBeNull();
        // the A♦ is the 7♥, below the 8♥
        expect(result.cards.map(({index}) => index)).toEqual([3, 2, 0, 4]);
        expect(result.layouts.map(span)).toEqual(["7–10 ♥", "8–J ♥"]);
    });

    it('lays a run out the way you choose, or else the first way', () => {
        const run = [7, 8, 9, 3];
        const from = (result: ReturnType<typeof slotResult>) => (result.check.valid ? result.check.setrun.cards[0].value : null);
        expect(from(slotResult(hand, RUN, run))).toBe(10);
        expect(from(slotResult(hand, RUN, run, 11))).toBe(11);
        expect(from(slotResult(hand, RUN, run, 5))).toBe(10);
    });

    it('offers no choice for a run that goes only one way', () => {
        expect(slotResult(hand, RUN, [0, 2, 4, 7]).layouts).toEqual([]);
    });
});

it('says which slot each card is in', () => {
    expect([...usedIn([[3, 1], [], [0]])]).toEqual([[3, 0], [1, 0], [0, 2]]);
});

it('marks the cards that would make a slot a setrun', () => {
    const hand = cards("7C 7S 7D 7H 9S");
    expect(completes(hand, SET, [0, 1], 2)).toBe(true);
    expect(completes(hand, SET, [0, 1], 4)).toBe(false);
    // not one that's already there, nor once it's a set
    expect(completes(hand, SET, [0, 1], 1)).toBe(false);
    expect(completes(hand, SET, [0, 1, 2], 3)).toBe(false);
});

it('gives the setruns to go down with, saying where a run starts only when it could start elsewhere', () => {
    const hand = cards("5C 5S 5D 11H 12H 13H 1D 9C 10C 11C 12C");
    const slots = makeSlots({S : 1, R : 2});
    const picks = [[0, 1, 2], [3, 4, 5, 6], [7, 8, 9, 10]];
    const results = picks.map((indices, i) => slotResult(hand, slots[i].type, indices, (i === 1) ? 11 : null));
    expect(finishedSlots(slots, picks, results)).toEqual([
        {type : SET, indices : [0, 1, 2]},
        {type : RUN, indices : [3, 4, 5, 6], from : 11},
        {type : RUN, indices : [7, 8, 9, 10]}
    ]);
});
