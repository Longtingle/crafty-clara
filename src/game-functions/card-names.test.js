import {createCard} from './deck-functions.js';
import {checkSetrun} from './hand-functions.js';
import {shortName, longName, isStandIn, standInName, setrunCaption, requirementText} from './card-names.js';
import {SET, RUN} from '../store/constants.js';

const card = (str) => createCard(parseInt(str.slice(0, -1)), str.slice(-1));
const cards = (str) => str.split(" ").map(card);

describe('card names', () => {
    it('names cards short and long', () => {
        expect(shortName(card("7D"))).toBe("7♦");
        expect(shortName(card("12S"))).toBe("Q♠");
        expect(longName(card("1H"))).toBe("Ace of hearts");
        expect(longName(card("10C"))).toBe("Ten of clubs");
    });

    it('keeps the real name of a wild ace in a setrun', () => {
        const run = checkSetrun(cards("4S 1H 6S 7S"), RUN).setrun;
        const wild = run.cards[1];
        expect(isStandIn(wild)).toBe(true);
        expect(shortName(wild)).toBe("A♥");
        expect(standInName(wild, RUN)).toBe("5♠");
        expect(isStandIn(run.cards[0])).toBe(false);
    });

    it('describes setruns and requirements', () => {
        expect(setrunCaption(checkSetrun(cards("13C 13S 1D"), SET).setrun)).toBe("Set of Kings");
        expect(setrunCaption(checkSetrun(cards("9C 9S 9D"), SET).setrun)).toBe("Set of 9s");
        expect(setrunCaption(checkSetrun(cards("12C 13C 1C 11C"), RUN).setrun)).toBe("Run J–A ♣");
        expect(requirementText({S : 1, R : 1})).toBe("1 set + 1 run");
        expect(requirementText({S : 0, R : 3})).toBe("3 runs");
    });
});
