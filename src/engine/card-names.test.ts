// @vitest-environment node
import {SET, RUN, type Setrun} from './cards.ts';
import {checkSetrun} from './setruns.ts';
import {shortName, longName, isStandIn, standInName, setrunCaption, requirementText} from './card-names.ts';
import {card, cards} from './testing.ts';

const setrun = (str: string, type: typeof SET | typeof RUN): Setrun => {
    let result = checkSetrun(cards(str), type);
    if (!result.valid) throw new Error(str + " isn't a valid " + type);
    return result.setrun;
};

describe('card names', () => {
    it('names cards short and long', () => {
        expect(shortName(card("7D"))).toBe("7♦");
        expect(shortName(card("12S"))).toBe("Q♠");
        expect(longName(card("1H"))).toBe("Ace of hearts");
        expect(longName(card("10C"))).toBe("Ten of clubs");
    });

    it('keeps the real name of a wild ace in a setrun', () => {
        const run = setrun("4S 1H 6S 7S", RUN);
        const wild = run.cards[1];
        expect(isStandIn(wild)).toBe(true);
        expect(shortName(wild)).toBe("A♥");
        expect(standInName(wild, RUN)).toBe("5♠");
        expect(isStandIn(run.cards[0])).toBe(false);
    });

    it('describes setruns and requirements', () => {
        expect(setrunCaption(setrun("13C 13S 1D", SET))).toBe("Set of Kings");
        expect(setrunCaption(setrun("9C 9S 9D", SET))).toBe("Set of 9s");
        expect(setrunCaption(setrun("12C 13C 1C 11C", RUN))).toBe("Run J–A ♣");
        expect(requirementText({S : 1, R : 1})).toBe("1 set + 1 run");
        expect(requirementText({S : 0, R : 3})).toBe("3 runs");
    });
});
