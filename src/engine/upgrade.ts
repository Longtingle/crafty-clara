// A game saved by an older version of the code, brought up to date: each
// change to the state's shape comes with a step from the version before, and
// a saved game takes every step from its own version on. The server will
// need this as much as the page does. It loads nothing else, so a saved
// game can be read before the rules are.

import type {GameState} from './game.ts';

/**
 * The shape of the state this code makes (GameState.version). Bump it with a
 * change to the state that an older game wouldn't have, and add the step that
 * brings an older one up to date.
 */
export const STATE_VERSION = 2;

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields => typeof value === "object" && value !== null && !Array.isArray(value);

/** The steps, in order: UPGRADES[0] brings version 1 to version 2, and so on. */
const UPGRADES: ((state: Fields) => void)[] = [
    // 1 (no version) to 2: the fields added with the look time and the
    // claim's showing time, as their absence meant (none)
    state => {
        state.claimShowMs ??= 0;
        state.lookMs ??= 0;
        state.look ??= null;
        if (isObject(state.claim)) state.claim.shownUntil ??= 0;
    }
];

/**
 * A saved state brought up to this code's version, as a copy, or null if it
 * isn't a game state at all, or is from a newer version than this code knows.
 */
export const upgradeState = (saved: unknown): GameState | null => {
    if (!isObject(saved) || !Array.isArray(saved.seats) || !Array.isArray(saved.deck)) return null;
    let version = saved.version ?? 1;
    if (!Number.isInteger(version) || (version as number) < 1 || (version as number) > STATE_VERSION) return null;
    let state = structuredClone(saved);
    for (let step = version as number; step < STATE_VERSION; step++) UPGRADES[step - 1](state);
    state.version = STATE_VERSION;
    return state as unknown as GameState;
};

if (UPGRADES.length !== STATE_VERSION - 1) throw new Error("Each version of the state needs a step up from the one before (upgrade.ts)");
