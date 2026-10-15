// @vitest-environment node
import type {BotLevel} from '@/engine/bot.ts';
import type {GameRecord} from '@/storage/history.ts';
import {gameResult, gameStats, lineupText, ordinal, percent, playedWhen} from './stats.ts';

const player = (name: string, level: BotLevel | null, scores: number[], downs: boolean[] = scores.map(() => true)) =>
    ({name, level, scores, downs});

// two-round games, from seat 0
// You 10, tied for lowest with Opponent 3, so a win. You went out of round 1.
const tied: GameRecord = {
    finishedAt : 1000,
    seat : 0,
    players : [
        player("You", null, [0, 10]),
        player("Opponent 1", "normal", [20, 5]),
        player("Opponent 2", "hard", [5, 30]),
        player("Opponent 3", "hard", [10, 0])
    ],
    outs : [0, 3]
};
// You 65, third behind Opponents 1 and 2. Caught in round 1.
const third: GameRecord = {
    finishedAt : 2000,
    seat : 0,
    players : [
        player("You", null, [40, 25], [false, true]),
        player("Opponent 1", "normal", [0, 15]),
        player("Opponent 2", "normal", [30, 0]),
        player("Opponent 3", "hard", [50, 60])
    ],
    outs : [1, 2]
};

describe('gameResult', () => {
    it('counts a tie for the lowest total as a win', () => {
        expect(gameResult(tied)).toEqual({
            finishedAt : 1000, place : 1, won : true, total : 10,
            lineup : ["normal", "hard", "hard"],
            rival : {name : "Opponent 3", total : 10}
        });
    });

    it('places you after everyone on a lower total', () => {
        expect(gameResult(third)).toMatchObject({place : 3, won : false, total : 65, rival : {name : "Opponent 1", total : 15}});
    });

    it('lists your opponents in turn order after you', () => {
        let record = {...tied, seat : 2};
        expect(gameResult(record).lineup).toEqual(["hard", null, "normal"]);
        expect(gameResult(record)).toMatchObject({total : 35, place : 4});
    });
});

describe('gameStats', () => {
    it('adds up your games', () => {
        const stats = gameStats([tied, third]);
        expect(stats).toMatchObject({
            games : 2,
            wins : 1,
            evenShare : 0.25,
            players : 4,
            averageScore : 37.5,
            bestScore : 10,
            places : [1, 0, 1, 0]
        });
        expect(stats.results.map(result => result.finishedAt)).toEqual([2000, 1000]);
    });

    it('counts the opponents of each level you finished below', () => {
        expect(gameStats([tied, third]).levels).toEqual([
            // beat Opponent 1 in the first game, nobody normal in the second
            {level : "normal", played : 3, beaten : 1},
            // beat Opponent 2 in the first (but not Opponent 3, level with you), Opponent 3 in the second
            {level : "hard", played : 3, beaten : 2}
        ]);
    });

    it('counts the rounds you got down in and went out of', () => {
        const stats = gameStats([tied, third]);
        expect(stats.rounds).toEqual({played : 4, down : 3, out : 1, pointsDown : 35, pointsCaught : 40});
        expect(stats.byRound).toEqual([
            {played : 2, down : 1, points : 40},
            {played : 2, down : 2, points : 35}
        ]);
    });

    it('has nothing to say before any games', () => {
        expect(gameStats([])).toMatchObject({games : 0, wins : 0, averageScore : 0, bestScore : 0, places : [], levels : [], byRound : []});
    });
});

it('words what it shows', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(ordinal)).toEqual(
        ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "103rd"]
    );
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBeNull();
    expect(lineupText(["normal", "hard", null])).toBe("Normal · Hard · Person");
});

it('says when a game was played', () => {
    const now = new Date(2026, 9, 15, 18, 0).getTime();
    expect(playedWhen(new Date(2026, 9, 15, 0, 5).getTime(), now)).toMatch(/^Today, /);
    expect(playedWhen(new Date(2026, 9, 14, 21, 40).getTime(), now)).toMatch(/^Yesterday, /);
    expect(playedWhen(new Date(2026, 9, 13, 21, 40).getTime(), now)).toMatch(/13/);
    expect(playedWhen(new Date(2025, 9, 13, 21, 40).getTime(), now)).toMatch(/2025/);
});
