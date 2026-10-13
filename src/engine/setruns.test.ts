// @vitest-environment node
import {SET, RUN, createCard, type Setrun} from './cards.ts';
import {checkSetrun, explainSetrun, addToSetrun, sortHand} from './setruns.ts';
import {card, cards, names, values} from './testing.ts';

// the setrun from cards that must make one
const setrun = (str: string, type: typeof SET | typeof RUN): Setrun => {
    let result = checkSetrun(cards(str), type);
    if (!result.valid) throw new Error(str + " isn't a valid " + type);
    return result.setrun;
};

describe('checkSetrun', () => {
    it('accepts a plain set and a plain run', () => {
        expect(checkSetrun(cards("7C 7H 7D"), SET).valid).toBe(true);
        expect(checkSetrun(cards("4S 6S 5S 7S"), RUN).valid).toBe(true);
    });

    it('returns runs in order', () => {
        expect(names(setrun("4S 6S 5S 7S", RUN))).toEqual(["4S", "5S", "6S", "7S"]);
    });

    it('rejects short or mixed setruns', () => {
        expect(checkSetrun(cards("7C 7H"), SET).valid).toBe(false);
        expect(checkSetrun(cards("7C 7H 8D"), SET).valid).toBe(false);
        expect(checkSetrun(cards("4S 5S 6S"), RUN).valid).toBe(false);
        expect(checkSetrun(cards("4S 5S 6H 7S"), RUN).valid).toBe(false);
        expect(checkSetrun(cards("4S 5S 5S 6S"), RUN).valid).toBe(false);
    });

    it('uses a red ace to fill a gap in a run', () => {
        const run = setrun("4S 1H 6S 7S", RUN);
        expect(values(run)).toEqual([4, 5, 6, 7]);
        expect(run.cards[1]).toMatchObject({value : 5, suit : "S", displayString : "1H"});
    });

    it('extends a run with a spare red ace, low end first', () => {
        expect(values(setrun("4S 5S 6S 1D", RUN))).toEqual([3, 4, 5, 6]);
        expect(values(setrun("1C 2C 3C 1D", RUN))).toEqual([1, 2, 3, 4]);
    });

    it('treats a black ace as high when it has to be', () => {
        expect(values(setrun("12C 13C 1C 11C", RUN))).toEqual([11, 12, 13, 14]);
    });

    it('uses a red ace in a set but not more wilds than naturals', () => {
        expect(checkSetrun(cards("7C 7H 1D"), SET).valid).toBe(true);
        expect(checkSetrun(cards("7C 1H 1D"), SET).valid).toBe(false);
    });
});

describe('explainSetrun', () => {
    it('returns null exactly when checkSetrun accepts the cards', () => {
        const examples: [string, typeof SET | typeof RUN][] = [
            ["7C 7H 7D", SET], ["7C 7H 1D", SET], ["7C 1H 1D", SET], ["7C 7H", SET], ["7C 7H 8D", SET],
            ["4S 5S 6S 7S", RUN], ["4S 1H 6S 7S", RUN], ["12C 13C 1C 11C", RUN], ["4S 5S 6S", RUN],
            ["4S 5S 6H 7S", RUN], ["4S 5S 5S 6S", RUN], ["3D 4D 6D 7D", RUN], ["3D 1H 1D 6D", RUN]
        ];
        examples.forEach(([str, type]) => {
            const hand = cards(str);
            expect(explainSetrun(hand, type) === null).toBe(checkSetrun(hand, type).valid);
        });
    });

    it('says what is wrong with a set', () => {
        expect(explainSetrun([], SET)).toBe("Pick 3 or more cards of the same value.");
        expect(explainSetrun(cards("7C 8C 7D"), SET)).toBe("Every card in a set must have the same value.");
        expect(explainSetrun(cards("7C 7H"), SET)).toBe("A set needs at least 3 cards. Add 1 more.");
        expect(explainSetrun(cards("7C 1H 1D"), SET)).toBe("Wild aces can't outnumber natural cards.");
    });

    it('names the cards missing from a run', () => {
        expect(explainSetrun(cards("3D 4D 6D 7D"), RUN)).toBe("There's a gap. Add the 5♦ or a wild ace.");
        expect(explainSetrun(cards("3D 4D 7D 8D"), RUN)).toBe("There are gaps. Add the 5♦ and 6♦, or wild aces in their place.");
        expect(explainSetrun(cards("4S 5S 6H 7S"), RUN)).toBe("Every card in a run must be the same suit.");
        expect(explainSetrun(cards("4S 5S 6S"), RUN)).toBe("A run needs at least 4 cards. Add 1 more.");
        expect(explainSetrun(cards("3D 4D 6D"), RUN)).toBe("There's a gap. Add the 5♦ or a wild ace.");
    });
});

describe('addToSetrun', () => {
    const run = setrun("4S 5S 6S 1H", RUN); // ace as 3S

    const added = (target: Setrun, str: string): Setrun => {
        let result = addToSetrun(target, card(str));
        if (!result.valid) throw new Error(str + " doesn't fit");
        return result.setrun;
    };

    it('adds to either end of a run', () => {
        expect(values(added(run, "7S"))).toEqual([3, 4, 5, 6, 7]);
        expect(values(added(run, "2S"))).toEqual([2, 3, 4, 5, 6]);
        expect(addToSetrun(run, card("8S")).valid).toBe(false);
        expect(addToSetrun(run, card("7H")).valid).toBe(false);
    });

    it('swaps a red ace for the card it stands in for and returns it', () => {
        const result = addToSetrun(run, card("3S"));
        expect(result.valid && names(result.setrun)).toEqual(["3S", "4S", "5S", "6S"]);
        expect(result.valid && result.returnedAce).toEqual(card("1H"));
    });

    it('returns the same physical ace, keeping its id', () => {
        const wild = createCard(1, "D", "1D-1-2");
        const check = checkSetrun([...cards("4C 5C 6C"), wild], RUN);
        if (!check.valid) throw new Error("not a run");
        const standIn = check.setrun.cards.find(c => c.ace)!;
        const result = addToSetrun(check.setrun, createCard(standIn.value, "C", "natural"));
        expect(result.valid && result.returnedAce).toEqual(wild);
    });

    it('adds to a set', () => {
        const set = setrun("9C 9D 9S", SET);
        expect(addToSetrun(set, card("9H")).valid).toBe(true);
        expect(addToSetrun(set, card("8H")).valid).toBe(false);
        expect(added(set, "1D").cards[3]).toMatchObject({value : 9, displayString : "1D"});
    });

    it('puts an ace after a king', () => {
        expect(values(added(setrun("10C 11C 12C 13C", RUN), "1C"))).toEqual([10, 11, 12, 13, 14]);
    });
});

describe('sortHand', () => {
    it('sorts by value for sets and by suit then value for runs', () => {
        const hand = cards("9S 2H 9C 13D 2C");
        expect(sortHand(hand, SET).map(c => c.value)).toEqual([2, 2, 9, 9, 13]);
        expect(sortHand(hand, RUN).map(c => c.displayString)).toEqual(["2C", "9C", "13D", "2H", "9S"]);
    });
});
