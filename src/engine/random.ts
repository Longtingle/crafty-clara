// A seeded random number generator (mulberry32), so that a game can be
// replayed from its seed. Its state is a plain number kept in the game state.

export interface Seeded {
    rng: number;
}

/** A number from 0 up to (not including) 1. Advances `seeded.rng`. */
export const random = (seeded: Seeded): number => {
    seeded.rng = (seeded.rng + 0x6D2B79F5) | 0;
    let t = seeded.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Shuffles `items` in place (Fisher–Yates) and returns it. */
export const shuffle = <T>(seeded: Seeded, items: T[]): T[] => {
    for (let i = items.length - 1; i > 0; i--) {
        let j = Math.floor(random(seeded) * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
};
