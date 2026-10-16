// The game in progress, saved after every move, so it survives the page
// being closed or reloaded (which phones do to pages left in the background).

import type {BotProfile} from '@/engine/bot.ts';
import {isCharacterId} from '@/engine/cast.ts';
import {isBotLevel} from '@/engine/levels.ts';
import {upgradeState} from '@/engine/upgrade.ts';
import type {LocalGameSave} from '@/host/local-game.ts';
import type {KeyValueStore} from './store.ts';

const KEY = "crafty-clara.game";
// The shape of a save around the game's state. A change to the state itself
// needs no new version here: the state carries its own, and an older one is
// brought up to date (upgradeState). Bump this only when the save around it
// changes in a way an old one can't be read. A save from another version is
// dropped.
const VERSION = 1;

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields => typeof value === "object" && value !== null && !Array.isArray(value);

// A bot from a save, with anything this build doesn't know put right: a level
// it doesn't know plays as normal, and a character it doesn't know (from a
// newer build) as nobody in particular, who keeps their name.
const readBot = (value: unknown): BotProfile | null => {
    if (!isObject(value) || typeof value.seed !== "number") return null;
    let bot: BotProfile = {level : isBotLevel(value.level) ? value.level : "normal", seed : value.seed};
    if (typeof value.risk === "number") bot.risk = value.risk;
    if (isCharacterId(value.character)) bot.character = value.character;
    return bot;
};

export interface SavedGame {
    /** the game in progress, if there is one */
    load(): Promise<LocalGameSave | null>;
    /** Keeps the game as it is now, in place of the last save. null forgets it. */
    save(game: LocalGameSave | null): void;
}

// A save from this version, with its state brought up to date, and enough
// of its shape there to carry on.
const readSave = (value: unknown): LocalGameSave | null => {
    if (!isObject(value) || value.version !== VERSION || !isObject(value.game)) return null;
    let {state : saved, bots : savedBots, savedAt} = value.game;
    let state = upgradeState(saved);
    if (!state || !Array.isArray(savedBots) || savedBots.length !== state.seats.length - 1 || typeof savedAt !== "number") return null;
    let bots = savedBots.map(readBot);
    return bots.every(bot => bot !== null) ? {state, bots, savedAt} : null;
};

export const createSavedGame = (store: KeyValueStore): SavedGame => {
    // Saves are written one at a time. One waiting its turn is replaced by
    // any newer one, so a slow store doesn't fall behind, and the last wins.
    let latest: LocalGameSave | null = null;
    let waiting = false;
    let writing = Promise.resolve();
    return {
        async load() {
            await writing;
            return readSave(await store.get(KEY));
        },
        save(game) {
            latest = game;
            if (waiting) return;
            waiting = true;
            writing = writing
                .then(() => {
                    waiting = false;
                    return latest ? store.set(KEY, {version : VERSION, game : latest}) : store.remove(KEY);
                })
                .catch(() => {});
        }
    };
};
