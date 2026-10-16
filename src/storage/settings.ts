// Your choices, kept for next time: who you play, how crafty each opponent
// is, how quickly the game goes, which hints you want while you play, how
// much table talk, and whether there's sound.

import {isBotLevel, type BotLevel} from '@/engine/levels.ts';
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

/** How you like the game, whichever game it is: the Settings dialog. */
export interface Preferences {
    hints: Hints;
    /** how much table talk you see */
    talk: TalkLevel;
    /** how quickly the bots play, and how long you have to claim a discard */
    speed: GameSpeed;
    /** whether the game makes sound */
    sound: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {hints : DEFAULT_HINTS, talk : DEFAULT_TALK, speed : DEFAULT_SPEED, sound : true};

const readHints = (saved: unknown): Hints => {
    let hints = {...DEFAULT_HINTS};
    let kept = saved as Partial<Record<keyof Hints, unknown>> | null;
    for (let key of Object.keys(hints) as (keyof Hints)[]) {
        if (typeof kept?.[key] === "boolean") hints[key] = kept[key];
    }
    return hints;
};

const isTalkLevel = (value: unknown): value is TalkLevel => value === "off" || value === "quiet" || value === "chatty";

export interface Settings {
    /** who sits in each opponent's seat, as last chosen, or null if never chosen */
    cast(): Promise<CharacterId[] | null>;
    setCast(cast: CharacterId[]): void;
    /** each opponent's level, as last chosen, or null if never chosen */
    levels(): Promise<BotLevel[] | null>;
    setLevels(levels: BotLevel[]): void;
    /** your preferences, with the default for any never chosen (or no longer understood) */
    preferences(): Promise<Preferences>;
    /** keeps the preferences given */
    setPreferences(changes: Partial<Preferences>): void;
}

// Each preference has a key of its own.
const PREFERENCE_KEYS: Record<keyof Preferences, string> = {hints : HINTS_KEY, talk : TALK_KEY, speed : SPEED_KEY, sound : SOUND_KEY};

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
        return (Array.isArray(saved) && saved.every(isBotLevel)) ? saved : null;
    },
    setLevels(levels) {
        void store.set(LEVELS_KEY, levels);
    },
    async preferences() {
        let [hints, talk, speed, sound] = await Promise.all([HINTS_KEY, TALK_KEY, SPEED_KEY, SOUND_KEY].map(key => store.get(key)));
        return {
            hints : readHints(hints),
            talk : isTalkLevel(talk) ? talk : DEFAULT_TALK,
            speed : isGameSpeed(speed) ? speed : DEFAULT_SPEED,
            // on unless you turn it off
            sound : sound !== false
        };
    },
    setPreferences(changes) {
        for (let key of Object.keys(changes) as (keyof Preferences)[]) {
            void store.set(PREFERENCE_KEYS[key], changes[key]);
        }
    }
});
