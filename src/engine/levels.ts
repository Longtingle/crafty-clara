// The levels of bot, and what each does besides playing its own hand (bot.ts).
// It's a module of its own, with nothing to load, so the home screen can
// offer the levels without loading the bots.

import type {Memory} from './clues.ts';

export type BotLevel = "normal" | "hard";

/** What a level of bot does, besides playing its own hand. */
export interface LevelTraits {
    /** it reads the table (clues.ts), remembering this well, or not at all */
    memory: Omit<Memory, "seed"> | null;
    /** it discards by points (an ace is 25) rather than by face value */
    discardsByPoints: boolean;
    /** it lays a red ace at the end of a run it likes best (likedBest), rather than where it goes by default */
    placesAces: boolean;
    /** it may hold off going down, as its risk dares (holdsOff) */
    holdsOff: boolean;
}

/** Each level of bot, easiest first. */
export const LEVEL_TRAITS: Record<BotLevel, LevelTraits> = {
    normal : {memory : null, discardsByPoints : false, placesAces : false, holdsOff : false},
    hard : {memory : {fresh : 0.95, fade : 0.92}, discardsByPoints : true, placesAces : true, holdsOff : true}
};

/** The levels, easiest first. */
export const BOT_LEVELS = Object.keys(LEVEL_TRAITS) as BotLevel[];

export const isBotLevel = (value: unknown): value is BotLevel => typeof value === "string" && Object.hasOwn(LEVEL_TRAITS, value);
