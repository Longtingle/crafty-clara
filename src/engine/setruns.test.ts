// @vitest-environment node
import {SET, RUN, createCard, isWild, type Setrun} from './cards.ts';
import {checkSetrun, explainSetrun, addToSetrun, runEnds, runLayouts, sortHand} from './setruns.ts';
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

    it('counts a red ace playing as itself as a natural card', () => {
        expect(checkSetrun(cards("1C 1H 1D"), SET).valid).toBe(true);
        expect(checkSetrun(cards("1H 1D 1H"), SET).valid).toBe(true);
        expect(values(setrun("1H 2H 3H 4H", RUN))).toEqual([1, 2, 3, 4]);
        expect(values(setrun("12H 13H 1H 11H", RUN))).toEqual([11, 12, 13, 14]);
        // the ace of hearts is the run's ace, so the ace of diamonds is its only wild
        const run = setrun("1H 1D 3H 4H", RUN);
        expect(names(run)).toEqual(["1H", "1D", "3H", "4H"]);
        expect(run.cards.map(isWild)).toEqual([false, true, false, false]);
        expect(values(setrun("12H 13H 1H 1D", RUN))).toEqual([11, 12, 13, 14]);
    });

    it('still counts a red ace of another suit as a wild', () => {
        expect(checkSetrun(cards("1D 1H 2S 3S"), RUN).valid).toBe(false);
        expect(checkSetrun(cards("1D 2H 3H 4H"), RUN).valid).toBe(true);
    });

    it('accepts a setrun it laid out itself', () => {
        for (let [str, type] of [["1C 1H 1D", SET], ["7C 7H 1D", SET], ["1H 1D 3H 4H", RUN], ["12H 13H 1H 1D", RUN], ["4S 1H 6S 7S", RUN]] as const) {
            expect(checkSetrun(setrun(str, type).cards, type).valid).toBe(true);
        }
    });
});

describe('explainSetrun', () => {
    it('returns null exactly when checkSetrun accepts the cards', () => {
        const examples: [string, typeof SET | typeof RUN][] = [
            ["7C 7H 7D", SET], ["7C 7H 1D", SET], ["7C 1H 1D", SET], ["7C 7H", SET], ["7C 7H 8D", SET],
            ["4S 5S 6S 7S", RUN], ["4S 1H 6S 7S", RUN], ["12C 13C 1C 11C", RUN], ["4S 5S 6S", RUN],
            ["4S 5S 6H 7S", RUN], ["4S 5S 5S 6S", RUN], ["3D 4D 6D 7D", RUN], ["3D 1H 1D 6D", RUN],
            ["1C 1H 1D", SET], ["1H 1D 3H 4H", RUN], ["1D 1H 2S 3S", RUN], ["1H 5H 6H 1D", RUN]
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

    it('explains a run with a red ace the way that comes closest', () => {
        // as the run's ace, the A♥ would leave gaps at 2, 3 and 4; as a wild it leaves none
        expect(explainSetrun(cards("1H 5H 6H 1D"), RUN)).toBe("A run needs at least 3 natural cards.");
        expect(explainSetrun(cards("1H 2H 3H"), RUN)).toBe("A run needs at least 4 cards. Add 1 more.");
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

    it('plays a red ace as itself where it can', () => {
        const aces = added(setrun("1C 1S 1H", SET), "1D");
        expect(aces.cards.map(isWild)).toEqual([false, false, false, false]);
        const low = added(setrun("2H 3H 4H 5H", RUN), "1H");
        expect(values(low)).toEqual([1, 2, 3, 4, 5]);
        expect(isWild(low.cards[0])).toBe(false);
        const high = added(setrun("10D 11D 12D 13D", RUN), "1D");
        expect(values(high)).toEqual([10, 11, 12, 13, 14]);
        expect(isWild(high.cards[4])).toBe(false);
    });

    it("doesn't let a red ace playing as itself be swapped out", () => {
        const result = addToSetrun(setrun("1S 1H 1D", SET), card("1C"));
        expect(result.valid && result.returnedAce).toBeNull();
        expect(result.valid && names(result.setrun)).toEqual(["1S", "1H", "1D", "1C"]);
    });

    it('counts only real wilds against the naturals', () => {
        // A♥ is this run's ace, so the A♦ can go on as a wild
        expect(addToSetrun(setrun("1H 2H 3H 4H", RUN), card("1D")).valid).toBe(true);
        expect(addToSetrun(setrun("7C 7S 1H", SET), card("1D")).valid).toBe(true);
        expect(addToSetrun(setrun("7C 7S 1H 1D", SET), card("1H", "another")).valid).toBe(false);
    });

    it('swaps a red ace for the natural ace it stands in for', () => {
        const run = setrun("1D 2H 3H 4H", RUN); // A♦ as A♥
        const result = addToSetrun(run, card("1H"));
        expect(result.valid && names(result.setrun)).toEqual(["1H", "2H", "3H", "4H"]);
        expect(result.valid && result.returnedAce).toEqual(card("1D"));
        const long = added(setrun("1S 2S 3S 4S 5S 6S 7S 8S 9S 10S 11S 12S 13S", RUN), "1H"); // A♥ as a high A♠
        const swap = addToSetrun(long, card("1S", "other"));
        expect(swap.valid && swap.returnedAce).toEqual(card("1H"));
        expect(swap.valid && swap.setrun.cards[13]).toMatchObject({id : "other", value : 14});
    });

    it('puts a red ace at the end of a run you choose', () => {
        const hearts = setrun("9H 10H 11H 12H 13H", RUN);
        // the A♥ goes on top as itself, unless you choose it as the 8♥
        expect(values(added(hearts, "1H"))).toEqual([9, 10, 11, 12, 13, 14]);
        const low = addToSetrun(hearts, card("1H"), "low");
        expect(low.valid && values(low.setrun)).toEqual([8, 9, 10, 11, 12, 13]);
        expect(low.valid && isWild(low.setrun.cards[0])).toBe(true);
        // the A♦ goes low as a wild, unless you choose it as a high A♥
        expect(values(added(hearts, "1D"))).toEqual([8, 9, 10, 11, 12, 13]);
        const high = addToSetrun(hearts, card("1D"), "high");
        expect(high.valid && high.setrun.cards[5]).toMatchObject({value : 14, suit : "H", displayString : "1D"});
        // a card that fits only one end doesn't go on the other
        expect(addToSetrun(hearts, card("8H"), "high").valid).toBe(false);
        expect(addToSetrun(setrun("1H 2H 3H 4H", RUN), card("1D"), "low").valid).toBe(false);
    });
});

describe('runLayouts', () => {
    it('gives each way to lay out a run, the one checkSetrun picks first', () => {
        // the A♦ as the 10♥ or as the A♥
        const kings = cards("11H 12H 13H 1D");
        expect(runLayouts(kings).map(values)).toEqual([[10, 11, 12, 13], [11, 12, 13, 14]]);
        expect(checkSetrun(kings, RUN)).toEqual({valid : true, setrun : runLayouts(kings)[0]});
        expect(values(runLayouts(cards("13H 11H 12H 1H"))[0])).toEqual([11, 12, 13, 14]);
        // the A♥ as itself on top, or a wild 10♥ below
        expect(runLayouts(cards("11H 12H 13H 1H")).map(values)).toEqual([[11, 12, 13, 14], [10, 11, 12, 13]]);
        // a wild in a gap has nowhere else to go
        expect(runLayouts(cards("5C 7C 8C 1D")).map(values)).toEqual([[5, 6, 7, 8]]);
        expect(runLayouts(cards("5C 7C 1D"))).toEqual([]);
    });

    it('lets checkSetrun lay a run out from the value chosen', () => {
        const kings = cards("11H 12H 13H 1D");
        const high = checkSetrun(kings, RUN, 11);
        expect(high.valid && high.setrun.cards[3]).toMatchObject({value : 14, suit : "H", displayString : "1D"});
        expect(checkSetrun(kings, RUN, 12).valid).toBe(false);
    });
});

describe('runEnds', () => {
    it('gives each end of a run a card can go on, low first', () => {
        const hearts = setrun("9H 10H 11H 12H 13H", RUN);
        expect(runEnds(hearts, card("1D")).map(place => [place.end, values(place)])).toEqual([
            ["low", [8, 9, 10, 11, 12, 13]],
            ["high", [9, 10, 11, 12, 13, 14]]
        ]);
        expect(runEnds(hearts, card("8H")).map(place => place.end)).toEqual(["low"]);
        expect(runEnds(hearts, card("5C"))).toEqual([]);
        expect(runEnds(setrun("1H 2H 3H 4H", RUN), card("1D")).map(place => place.end)).toEqual(["high"]);
    });

    it('has none for a set, or for a card that would replace a wild', () => {
        expect(runEnds(setrun("9C 9D 9S", SET), card("1D"))).toEqual([]);
        expect(runEnds(setrun("4S 5S 6S 1H", RUN), card("3S"))).toEqual([]);
    });
});

describe('sortHand', () => {
    it('sorts by value then suit for sets, and by suit then value for runs', () => {
        const hand = cards("9S 2H 9C 13D 2C");
        expect(sortHand(hand, SET).map(c => c.displayString)).toEqual(["2H", "2C", "9C", "9S", "13D"]);
        expect(sortHand(hand, RUN).map(c => c.displayString)).toEqual(["2H", "2C", "9C", "13D", "9S"]);
    });

    it('alternates red and black suits', () => {
        const hand = cards("5S 5D 5C 5H");
        expect(sortHand(hand, RUN).map(c => c.suit)).toEqual(["H", "C", "D", "S"]);
    });
});
