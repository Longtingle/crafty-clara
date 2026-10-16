// @vitest-environment node
import type {GameView} from '@/engine/view.ts';
import type {ScoreRow} from './scores.ts';
import {roundSummary} from './round-summary.ts';

const NAMES = ["You", "Clara", "Alan", "Gemma"];

// the end of round 2 (or the game), with everyone's totals, who went out, and who's ready
const ended = ({totals, out = null, ready = [], over = false}: {totals: number[]; out?: number | null; ready?: number[]; over?: boolean}) => {
    const view = {
        phase : over ? "gameEnd" : "roundEnd",
        round : 1,
        rounds : 7,
        seat : 0,
        seats : NAMES.map((name, seat) => ({name, ready : ready.includes(seat)}))
    } as unknown as GameView;
    const rows = NAMES.map((name, seat) => ({name, isYou : seat === 0, total : totals[seat], wentOut : seat === out}) as ScoreRow);
    return roundSummary(view, rows);
};

it('says who went out, and how far you are behind the leader', () => {
    expect(ended({totals : [40, 25, 60, 31], out : 1})).toMatchObject({
        eyebrow : "Round 2 of 7 complete",
        title : "Clara went out",
        standing : "You're 15 points behind Clara."
    });
});

it('says when you went out, and when you lead', () => {
    expect(ended({totals : [10, 25, 60, 10], out : 0})).toMatchObject({title : "You went out!", standing : "You're in the lead."});
});

it('says when the deck ran out with nobody out', () => {
    expect(ended({totals : [10, 25, 60, 31]}).title).toBe("The deck ran out");
});

it('names who it is waiting for', () => {
    expect(ended({totals : [0, 0, 0, 0], ready : [0, 2]}).waitingFor).toEqual(["Clara", "Gemma"]);
});

describe('at the end of the game', () => {
    it('says who won, and by how much you lost', () => {
        expect(ended({totals : [140, 110, 180, 200], over : true})).toMatchObject({
            eyebrow : "Game over",
            title : "Clara wins",
            standing : "You finished 30 points behind Clara."
        });
    });

    it('says when you won, and by how much', () => {
        expect(ended({totals : [98, 110, 180, 200], over : true})).toMatchObject({
            title : "You win!",
            standing : "You finished 12 points ahead of Clara."
        });
    });

    it('counts a tie for the lowest total as a win', () => {
        expect(ended({totals : [110, 140, 110, 200], over : true})).toMatchObject({
            title : "You win!",
            standing : "You tied with Alan for the lowest total."
        });
    });
});
