// The game in progress, saved after every move, so it survives the page
// being closed or reloaded (which phones do to pages left in the background).

import type {LocalGameSave} from '@/host/local-game.ts';
import type {KeyValueStore} from './store.ts';

const KEY = "crafty-clara.game";
// Bump this when a change to the game's state would break a game saved
// before it. A save from another version is dropped.
const VERSION = 1;

export interface SavedGame {
    /** the game in progress, if there is one */
    load(): Promise<LocalGameSave | null>;
    /** Keeps the game as it is now, in place of the last save. null forgets it. */
    save(game: LocalGameSave | null): void;
}

// A save from this version, with enough of its shape there to carry on.
const readSave = (value: unknown): LocalGameSave | null => {
    let saved = value as {version?: unknown; game?: Partial<LocalGameSave>} | null;
    let game = (saved?.version === VERSION) ? saved.game : undefined;
    let seats = game?.state?.seats;
    let fits = Array.isArray(seats) && Array.isArray(game?.bots) && game.bots.length === seats.length - 1 &&
        typeof game.savedAt === "number";
    return fits ? game as LocalGameSave : null;
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
