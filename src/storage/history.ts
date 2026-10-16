// Your finished games, for stats. Each is kept as a record of what happened,
// not what it adds up to, so stats can be worked out in new ways later.

import type {BotLevel} from '@/engine/levels.ts';
import type {CharacterId} from '@/engine/cast.ts';
import type {GameView} from '@/engine/view.ts';
import type {SeatInfo} from '@/host/protocol.ts';
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
    /**
     * names the record, so a copy kept elsewhere (on a server, later) isn't
     * counted twice; absent in games recorded before
     */
    id?: string;
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
    /** who a bot was, if one of the cast (not in games from before the cast) */
    character?: CharacterId;
    /** their points in each round */
    scores: number[];
    /** whether they got down in each round */
    downs: boolean[];
}

// a new record's name, different from every other's
const newId = (): string => globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);

/** The record of a game that has ended, from its last view, with who sat in each seat. */
export const gameRecord = (view: GameView, seats: SeatInfo[], finishedAt: number, id = newId()): GameRecord => ({
    id,
    finishedAt,
    seat : view.seat,
    players : view.seats.map((player, seat) => ({
        name : player.name,
        level : seats[seat]?.level ?? null,
        ...(seats[seat]?.character ? {character : seats[seat].character} : {}),
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
