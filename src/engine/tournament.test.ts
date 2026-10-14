// @vitest-environment node
import {botMove} from './bot.ts';
import type {Player} from './simulate.ts';
import {playTournament} from './tournament.ts';

describe('playTournament', () => {
    it('gives every contestant every seat, with the same deals', () => {
        let seatsPlayed = new Set<number>();
        const watched: Player = view => {
            seatsPlayed.add(view.seat);
            return botMove(view);
        };
        const result = playTournament({
            lineup : [{name : "A", player : watched}, {name : "B", player : botMove}, {name : "B", player : botMove}],
            deals : 2
        });
        expect(seatsPlayed).toEqual(new Set([0, 1, 2]));
        expect(result.games).toBe(6);
        expect(result.stalled).toBe(0);

        const [a, b] = result.standings;
        expect([a.name, a.seats, b.name, b.seats]).toEqual(["A", 6, "B", 12]);
        // one win per game, shared on a tie
        expect(a.winRate * a.seats + b.winRate * b.seats).toBeCloseTo(6);

        // A and B are the same bot, and each deal plays the same way whoever
        // sits where, so neither can have an edge
        expect(result.edge?.mean).toBeCloseTo(0);
        expect(a.meanScore).toBeCloseTo(b.meanScore);
    }, 30_000);
});
