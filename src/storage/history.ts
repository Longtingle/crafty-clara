// Your finished games, for stats. Each is kept as a record of what happened,
// not what it adds up to, so stats can be worked out in new ways later.

import type {BotLevel} from '@/engine/bot.ts';
import type {GameView} from '@/engine/view.ts';
import type {KeyValueStore} from './store.ts';

const KEY = "crafty-clara.history";
// This is the player's history, so a change to GameRecord needs a way to
// read the older versions, not a fresh start. A version this code doesn't
// know (from a newer build) is left alone.
const VERSION = 1;
// how many games are kept: the newest
const KEEP = 1000;

/** A finished game, from your seat. */
export interface GameRecord {
    /** when it finished, in ms since 1970 */
    finishedAt: number;
    /** your seat */
    seat: number;
    /** by seat, in turn order */
    players: PlayerRecord[];
    /** who went out of each round, by seat; null when the deck ran out */
    outs: (number | null)[];
}

export interface PlayerRecord {
    name: string;
    /** a bot's level, or null for a person */
    level: BotLevel | null;
    /** their points in each round */
    scores: number[];
    /** whether they got down in each round */
    downs: boolean[];
}

/** The record of a game that has ended, from its last view. */
export const gameRecord = (view: GameView, levels: (BotLevel | null)[], finishedAt: number): GameRecord => ({
    finishedAt,
    seat : view.seat,
    players : view.seats.map((player, seat) => ({
        name : player.name,
        level : levels[seat] ?? null,
        scores : player.scores,
        downs : player.downs
    })),
    outs : view.outs
});

export interface GameHistory {
    /** your finished games, oldest first, including any still being added */
    list(): Promise<GameRecord[]>;
    add(record: GameRecord): Promise<void>;
}

export const createGameHistory = (store: KeyValueStore): GameHistory => {
    // the games kept, or null if they're from a version this code doesn't know
    const read = async (): Promise<GameRecord[] | null> => {
        let saved = await store.get(KEY) as {version?: unknown; games?: unknown} | null;
        if (saved === null) return [];
        return (saved.version === VERSION && Array.isArray(saved.games)) ? saved.games : null;
    };
    // one change at a time, so two games finishing together are both kept
    let adding = Promise.resolve();
    return {
        list : async () => {
            await adding;
            return (await read()) ?? [];
        },
        add(record) {
            adding = adding
                .then(async () => {
                    let games = await read();
                    if (games) await store.set(KEY, {version : VERSION, games : [...games, record].slice(-KEEP)});
                })
                .catch(() => {});
            return adding;
        }
    };
};
