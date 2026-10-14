// @vitest-environment node
import {DECK_PILE, DISCARD_PILE, HAND_AREA, meldTarget, parseTarget} from './drop-targets.ts';

describe('parseTarget', () => {
    it('reads the piles, the hand and the melds, and takes anything else for a card in the hand', () => {
        expect(parseTarget(DISCARD_PILE)).toEqual({kind : "discard"});
        expect(parseTarget(DECK_PILE)).toEqual({kind : "deck"});
        expect(parseTarget(HAND_AREA)).toEqual({kind : "hand"});
        expect(parseTarget(meldTarget(2, 1))).toEqual({kind : "meld", seat : 2, index : 1});
        expect(parseTarget("k3f9-17")).toBeNull();
    });
});
