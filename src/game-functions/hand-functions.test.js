import {createCard} from './deck-functions.js';
import {getRuns, getSets, scoreHand, checkSetrun, explainSetrun, addToSetrun, getPoints} from './hand-functions.js';
import {SET, RUN} from '../store/constants.js';

// "10H" -> createCard(10, "H")
const card = (str) => createCard(parseInt(str.slice(0, -1)), str.slice(-1));
const cards = (str) => str.split(" ").map(card);
const names = (setrun) => setrun.cards.map(c => c.displayString);
const values = (setrun) => setrun.cards.map(c => c.value);

describe('getSets', () => {
    it('groups pairs and better by value, best first', () => {
        const result = getSets(cards("2C 9H 2D 9S 9C 5H"));
        expect(result.numFullSets).toBe(1);
        expect(result.sets.map(values)).toEqual([[9, 9, 9], [2, 2]]);
    });
});

describe('getRuns', () => {
    it('finds runs per suit and ignores duplicate cards', () => {
        const result = getRuns(cards("5C 6C 6C 7C 8C 2H 3H"));
        expect(result.numFullRuns).toBe(1);
        expect(names(result.runs[0])).toEqual(["5C", "6C", "7C", "8C"]);
        expect(names(result.runs[1])).toEqual(["2H", "3H"]);
    });

    it('lets an ace follow a king', () => {
        const result = getRuns(cards("11S 12S 13S 1S"));
        expect(values(result.runs[0])).toEqual([11, 12, 13, 14]);
    });
});

describe('checkSetrun', () => {
    it('accepts a plain set and a plain run', () => {
        expect(checkSetrun(cards("7C 7H 7D"), SET).valid).toBe(true);
        expect(checkSetrun(cards("4S 6S 5S 7S"), RUN).valid).toBe(true);
    });

    it('returns runs in order', () => {
        expect(names(checkSetrun(cards("4S 6S 5S 7S"), RUN).setrun)).toEqual(["4S", "5S", "6S", "7S"]);
    });

    it('rejects short or mixed setruns', () => {
        expect(checkSetrun(cards("7C 7H"), SET).valid).toBe(false);
        expect(checkSetrun(cards("7C 7H 8D"), SET).valid).toBe(false);
        expect(checkSetrun(cards("4S 5S 6S"), RUN).valid).toBe(false);
        expect(checkSetrun(cards("4S 5S 6H 7S"), RUN).valid).toBe(false);
        expect(checkSetrun(cards("4S 5S 5S 6S"), RUN).valid).toBe(false);
    });

    it('uses a red ace to fill a gap in a run', () => {
        const result = checkSetrun(cards("4S 1H 6S 7S"), RUN);
        expect(result.valid).toBe(true);
        expect(values(result.setrun)).toEqual([4, 5, 6, 7]);
        expect(result.setrun.cards[1]).toMatchObject({value : 5, suit : "S", displayString : "1H"});
    });

    it('extends a run with a spare red ace, low end first', () => {
        expect(values(checkSetrun(cards("4S 5S 6S 1D"), RUN).setrun)).toEqual([3, 4, 5, 6]);
        expect(values(checkSetrun(cards("1C 2C 3C 1D"), RUN).setrun)).toEqual([1, 2, 3, 4]);
    });

    it('treats a black ace as high when it has to be', () => {
        expect(values(checkSetrun(cards("12C 13C 1C 11C"), RUN).setrun)).toEqual([11, 12, 13, 14]);
    });

    it('uses a red ace in a set but not more wilds than naturals', () => {
        expect(checkSetrun(cards("7C 7H 1D"), SET).valid).toBe(true);
        expect(checkSetrun(cards("7C 1H 1D"), SET).valid).toBe(false);
    });
});

describe('explainSetrun', () => {
    it('returns null exactly when checkSetrun accepts the cards', () => {
        const examples = [
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
    const run = checkSetrun(cards("4S 5S 6S 1H"), RUN).setrun; // ace as 3S

    it('adds to either end of a run', () => {
        expect(values(addToSetrun(run, card("7S")).setrun)).toEqual([3, 4, 5, 6, 7]);
        expect(values(addToSetrun(run, card("2S")).setrun)).toEqual([2, 3, 4, 5, 6]);
        expect(addToSetrun(run, card("8S")).valid).toBe(false);
        expect(addToSetrun(run, card("7H")).valid).toBe(false);
    });

    it('swaps a red ace for the card it stands in for and returns it', () => {
        const result = addToSetrun(run, card("3S"));
        expect(names(result.setrun)).toEqual(["3S", "4S", "5S", "6S"]);
        expect(result.returnedAce).toEqual(createCard(1, "H"));
    });

    it('adds to a set', () => {
        const set = checkSetrun(cards("9C 9D 9S"), SET).setrun;
        expect(addToSetrun(set, card("9H")).valid).toBe(true);
        expect(addToSetrun(set, card("8H")).valid).toBe(false);
        expect(addToSetrun(set, card("1D")).setrun.cards[3]).toMatchObject({value : 9, displayString : "1D"});
    });

    it('puts an ace after a king', () => {
        const high = checkSetrun(cards("10C 11C 12C 13C"), RUN).setrun;
        expect(values(addToSetrun(high, card("1C")).setrun)).toEqual([10, 11, 12, 13, 14]);
    });
});

describe('scoreHand', () => {
    it('is ready to go down when the requirement is met', () => {
        const hand = cards("7C 7H 7D 2S 2H 2C 9D 13S 4H 5C 11D 12H");
        expect(scoreHand(hand, {S : 2, R : 0}).readyToGoDown).toBe(true);
        expect(scoreHand(hand, {S : 1, R : 1}).readyToGoDown).toBe(false);
    });

    it('completes a set or run with a red ace', () => {
        expect(scoreHand(cards("7C 7H 4S 5S 6S 1D"), {S : 1, R : 1}).readyToGoDown).toBe(false);
        expect(scoreHand(cards("7C 7H 7S 4S 5S 6S 1D"), {S : 1, R : 1}).readyToGoDown).toBe(true);
    });

    it('does not use the same card in a run and a set', () => {
        const result = scoreHand(cards("4S 5S 6S 7S 7C 7H"), {S : 1, R : 1});
        expect(result.readyToGoDown).toBe(false);
    });
});

describe('getPoints', () => {
    it('scores aces 25, tens and faces 10, others face value', () => {
        expect(getPoints(cards("1C 10H 13S 7D"))).toBe(25 + 10 + 10 + 7);
    });
});
