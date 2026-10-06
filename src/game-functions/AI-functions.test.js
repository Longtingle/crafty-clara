import {createCard} from './deck-functions.js';
import {checkSetrun} from './hand-functions.js';
import AIFunctions from './AI-functions.js';
import {RUN} from '../store/constants.js';

const card = (str) => createCard(parseInt(str.slice(0, -1)), str.slice(-1));
const cards = (str) => str.split(" ").map(card);

describe('canGoDown', () => {
    it('lays down the best hand and keeps the rest', () => {
        const hand = cards("7C 7H 7D 2S 2H 2C 9D 13S");
        const result = AIFunctions.canGoDown(hand, {S : 2, R : 0});
        expect(result.result).toBe(true);
        expect(result.table).toHaveLength(2);
        expect(result.newHand.map(c => c.displayString)).toEqual(["9D", "13S"]);
    });

    it('waits when the requirement is not met', () => {
        expect(AIFunctions.canGoDown(cards("7C 7H 2S 2H 9D"), {S : 2, R : 0}).result).toBe(false);
    });
});

describe('selectDiscard', () => {
    it('throws away the highest card that is no use', () => {
        const hand = cards("7C 7H 7D 2S 2H 9D 4C");
        expect(hand[AIFunctions.selectDiscard(hand, {S : 2, R : 0})].displayString).toBe("9D");
    });

    it('keeps red aces', () => {
        const hand = cards("1H 3C 2D");
        expect(hand[AIFunctions.selectDiscard(hand, {S : 2, R : 0}, true)].displayString).toBe("3C");
    });
});

describe('AIHandBuild', () => {
    it('finds a card that extends a setrun on the table', () => {
        const table = [checkSetrun(cards("4S 5S 6S 7S"), RUN).setrun];
        const result = AIFunctions.AIHandBuild(cards("9D 8S"), [], table);
        expect(result.result).toBe(true);
        expect(result.playerType).toBe("player");
        expect(result.newHand.map(c => c.displayString)).toEqual(["9D"]);
        expect(result.newSetrun.cards).toHaveLength(5);
    });

    it('reports when nothing fits', () => {
        const table = [checkSetrun(cards("4S 5S 6S 7S"), RUN).setrun];
        expect(AIFunctions.AIHandBuild(cards("9D 10S"), [], table).result).toBe(false);
    });
});
