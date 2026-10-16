import type {BotLevel} from '@/engine/levels.ts';

/** What each level of bot is called, and what it does. */
export const LEVEL_NAMES: Record<BotLevel, {name: string; about: string}> = {
    normal : {name : "Normal", about : "Plays its own hand well."},
    hard : {name : "Hard", about : "Counts every point, and keeps an eye on what everyone picks up."}
};

/** Whether a level is worth a tag beside a player's name: any but normal. */
export const isTagged = (level: BotLevel | null): boolean => level !== null && level !== "normal";
