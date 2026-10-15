// Your choices, kept for next time: for now, how crafty each opponent is.

import type {BotLevel} from '@/engine/bot.ts';
import type {KeyValueStore} from './store.ts';

const LEVELS_KEY = "crafty-clara.levels";

export interface Settings {
    /** each opponent's level, as last chosen, or null if never chosen */
    levels(): Promise<BotLevel[] | null>;
    setLevels(levels: BotLevel[]): void;
}

export const createSettings = (store: KeyValueStore): Settings => ({
    async levels() {
        let saved = await store.get(LEVELS_KEY);
        return (Array.isArray(saved) && saved.every(level => level === "normal" || level === "hard")) ? saved : null;
    },
    setLevels(levels) {
        void store.set(LEVELS_KEY, levels);
    }
});
