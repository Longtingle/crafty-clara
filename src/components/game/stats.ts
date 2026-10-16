import {BOT_LEVELS, type BotLevel} from '@/engine/levels.ts';
import {LEVEL_NAMES} from './level-names.ts';
import type {GameRecord} from '@/storage/history.ts';

// Your stats, worked out from the records of your finished games
// (src/storage/history.ts). The lowest total wins, and a tie for the lowest
// counts as a win, as it does on the game-over screen.

/** How one finished game went for you. */
export interface GameResult {
    finishedAt: number;
    /** your place, from 1. Players on the same total share a place. */
    place: number;
    won: boolean;
    /** your total */
    total: number;
    /** your opponents' levels, in turn order after you (null for a person) */
    lineup: (BotLevel | null)[];
    /** the opponent who did best: the winner, or the runner-up when you won */
    rival: {name: string; total: number} | null;
}

/** How you did against one level of bot. */
export interface LevelRecord {
    level: BotLevel;
    /** how many of them you've played, counting each opponent in each game */
    played: number;
    /** how many of those you finished on a lower total than */
    beaten: number;
}

/** How you did in one round of the game (round 1, round 2...). */
export interface RoundRecord {
    played: number;
    down: number;
    points: number;
}

export interface Stats {
    games: number;
    wins: number;
    /** the share of games you'd win if everyone played as well as you: one in however many players */
    evenShare: number;
    /** how many players every game had, or null if they've differed */
    players: number | null;
    /** your average and lowest totals (0 before any games) */
    averageScore: number;
    bestScore: number;
    /** how many times you finished in each place, from 1st */
    places: number[];
    /** against each level you've played, Normal first */
    levels: LevelRecord[];
    /** every round of every game */
    rounds: {played: number; down: number; out: number; pointsDown: number; pointsCaught: number};
    /** each round of the game: round 1, round 2... */
    byRound: RoundRecord[];
    /** your games, newest first */
    results: GameResult[];
}

const totalOf = (scores: number[]): number => scores.reduce((sum, points) => sum + points, 0);

/** How a finished game went for you. */
export const gameResult = (record: GameRecord): GameResult => {
    let totals = record.players.map(player => totalOf(player.scores));
    let total = totals[record.seat];
    let place = 1 + totals.filter(other => other < total).length;
    // your opponents in turn order after you
    let count = record.players.length;
    let opponents = Array.from({length : count - 1}, (_, i) => (record.seat + 1 + i) % count);
    let rival = opponents.reduce<number | null>((best, seat) => (best === null || totals[seat] < totals[best]) ? seat : best, null);
    return {
        finishedAt : record.finishedAt,
        place,
        won : place === 1,
        total,
        lineup : opponents.map(seat => record.players[seat].level),
        rival : (rival === null) ? null : {name : record.players[rival].name, total : totals[rival]}
    };
};

/** Your stats from your finished games, oldest first. */
export const gameStats = (records: GameRecord[]): Stats => {
    let results = records.map(gameResult);
    let counts = new Set(records.map(record => record.players.length));
    let most = Math.max(0, ...counts);

    let levels = new Map<BotLevel, LevelRecord>();
    let rounds = {played : 0, down : 0, out : 0, pointsDown : 0, pointsCaught : 0};
    let byRound: RoundRecord[] = [];
    records.forEach((record, index) => {
        let you = record.players[record.seat];
        let total = results[index].total;
        record.players.forEach((player, seat) => {
            if (seat === record.seat || player.level === null) return;
            let level = levels.get(player.level) ?? {level : player.level, played : 0, beaten : 0};
            level.played++;
            if (total < totalOf(player.scores)) level.beaten++;
            levels.set(player.level, level);
        });
        you.scores.forEach((points, round) => {
            let down = you.downs[round] ?? false;
            rounds.played++;
            if (down) {
                rounds.down++;
                rounds.pointsDown += points;
            } else {
                rounds.pointsCaught += points;
            }
            if (record.outs[round] === record.seat) rounds.out++;
            byRound[round] ??= {played : 0, down : 0, points : 0};
            byRound[round].played++;
            if (down) byRound[round].down++;
            byRound[round].points += points;
        });
    });

    return {
        games : records.length,
        wins : results.filter(result => result.won).length,
        evenShare : (records.length === 0) ? 0 : totalOf(records.map(record => 1 / record.players.length)) / records.length,
        players : (counts.size === 1) ? most : null,
        averageScore : (results.length === 0) ? 0 : totalOf(results.map(result => result.total)) / results.length,
        bestScore : (results.length === 0) ? 0 : Math.min(...results.map(result => result.total)),
        places : Array.from({length : most}, (_, i) => results.filter(result => result.place === i + 1).length),
        levels : BOT_LEVELS.flatMap(level => levels.get(level) ?? []),
        rounds,
        byRound,
        results : results.toReversed()
    };
};

/** A share as a whole percentage, or null when there's nothing to share. */
export const percent = (part: number, whole: number): number | null =>
    (whole === 0) ? null : Math.round(part / whole * 100);

/** 1st, 2nd, 3rd, 4th... */
export const ordinal = (n: number): string => {
    let tens = n % 100;
    let suffix = (tens >= 11 && tens <= 13) ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
    return n + suffix;
};

const startOfDay = (time: number): number => {
    let date = new Date(time);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

/** When a game finished, from now: "Today, 14:20", "Yesterday, 21:40", "Tue 13 Oct". */
export const playedWhen = (finishedAt: number, now: number): string => {
    let today = startOfDay(now);
    let day = startOfDay(finishedAt);
    let time = new Date(finishedAt).toLocaleTimeString(undefined, {hour : "numeric", minute : "2-digit"});
    if (day === today) return "Today, " + time;
    // a day back, even across a change of the clocks
    if (day === startOfDay(today - 12 * 60 * 60 * 1000)) return "Yesterday, " + time;
    let sameYear = new Date(finishedAt).getFullYear() === new Date(now).getFullYear();
    return new Date(finishedAt).toLocaleDateString(undefined, {
        weekday : "short", day : "numeric", month : "short", year : sameYear ? undefined : "numeric"
    });
};

/** "Normal · Normal · Hard" */
export const lineupText = (lineup: (BotLevel | null)[]): string =>
    lineup.map(level => (level === null) ? "Person" : LEVEL_NAMES[level].name).join(" · ");
