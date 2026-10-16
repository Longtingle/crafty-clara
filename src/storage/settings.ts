// Your choices, kept for next time: who you play, how crafty each opponent
// is, how quickly the game goes, which hints you want while you play, how
// much table talk, and whether there's sound.

import type {BotLevel} from '@/engine/bot.ts';
import {isCharacterId, type CharacterId} from '@/engine/cast.ts';
import {DEFAULT_SPEED, isGameSpeed, type GameSpeed} from '@/host/game-speed.ts';
import type {KeyValueStore} from './store.ts';

const CAST_KEY = "crafty-clara.cast";
const LEVELS_KEY = "crafty-clara.levels";
const HINTS_KEY = "crafty-clara.hints";
const TALK_KEY = "crafty-clara.talk";
const SPEED_KEY = "crafty-clara.speed";
const SOUND_KEY = "crafty-clara.sound";

/** How much of the table talk you see: none, just the big moments, or all of it. */
export type TalkLevel = "off" | "quiet" | "chatty";

export const DEFAULT_TALK: TalkLevel = "chatty";

/** Help while you play, each on or off. */
export interface Hints {
    /** once you're down, a gold dot on each card in your hand that fits a meld */
    fits: boolean;
    /** the melds the card you pick fits light up, and the prompt says what it would do there */
    targets: boolean;
    /** Go down glows, and the prompt says so, once your hand has what the round needs */
    ready: boolean;
}

export const DEFAULT_HINTS: Hints = {fits : true, targets : true, ready : false};

export interface Settings {
    /** who sits in each opponent's seat, as last chosen, or null if never chosen */
    cast(): Promise<CharacterId[] | null>;
    setCast(cast: CharacterId[]): void;
    /** each opponent's level, as last chosen, or null if never chosen */
    levels(): Promise<BotLevel[] | null>;
    setLevels(levels: BotLevel[]): void;
    /** your hints, with the defaults for any never chosen */
    hints(): Promise<Hints>;
    setHints(hints: Hints): void;
    /** how much table talk you see */
    talk(): Promise<TalkLevel>;
    setTalk(level: TalkLevel): void;
    /** how quickly the bots play, and how long you have to claim a discard */
    speed(): Promise<GameSpeed>;
    setSpeed(speed: GameSpeed): void;
    /** whether the game makes sound (it does unless you turn it off) */
    sound(): Promise<boolean>;
    setSound(on: boolean): void;
}

export const createSettings = (store: KeyValueStore): Settings => ({
    async cast() {
        let saved = await store.get(CAST_KEY);
        return (Array.isArray(saved) && saved.every(isCharacterId) && new Set(saved).size === saved.length) ? saved : null;
    },
    setCast(cast) {
        void store.set(CAST_KEY, cast);
    },
    async levels() {
        let saved = await store.get(LEVELS_KEY);
        return (Array.isArray(saved) && saved.every(level => level === "normal" || level === "hard")) ? saved : null;
    },
    setLevels(levels) {
        void store.set(LEVELS_KEY, levels);
    },
    async hints() {
        let saved = await store.get(HINTS_KEY) as Partial<Record<keyof Hints, unknown>> | null;
        let hints = {...DEFAULT_HINTS};
        for (let key of Object.keys(hints) as (keyof Hints)[]) {
            if (typeof saved?.[key] === "boolean") hints[key] = saved[key];
        }
        return hints;
    },
    setHints(hints) {
        void store.set(HINTS_KEY, hints);
    },
    async talk() {
        let saved = await store.get(TALK_KEY);
        return (saved === "off" || saved === "quiet" || saved === "chatty") ? saved : DEFAULT_TALK;
    },
    setTalk(level) {
        void store.set(TALK_KEY, level);
    },
    async speed() {
        let saved = await store.get(SPEED_KEY);
        return isGameSpeed(saved) ? saved : DEFAULT_SPEED;
    },
    setSpeed(speed) {
        void store.set(SPEED_KEY, speed);
    },
    async sound() {
        return (await store.get(SOUND_KEY)) !== false;
    },
    setSound(on) {
        void store.set(SOUND_KEY, on);
    }
});
