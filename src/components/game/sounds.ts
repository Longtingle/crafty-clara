// What the game sounds like: a sound for each thing that happens, worked out
// from what's new in a view since the last one. Playing them is
// src/lib/audio.ts's job; the files are public/audio/<sound>.mp3.

import type {GameView} from '@/engine/view.ts';

/** A moment that has a sound. */
export type Sound =
    | "deal" | "draw" | "take" | "discard" | "add" | "goDown"
    | "claim" | "yourTurn" | "canClaim"
    | "youOut" | "otherOut" | "won" | "lost";

/**
 * How loud each sound plays, from 0 to 1: the cards quieter than what needs
 * your ear. A moment left out is quiet: a discard you could claim (the
 * prompt is enough).
 */
export const VOLUME: Partial<Record<Sound, number>> = {
    deal : 0.55,
    draw : 0.6,
    take : 0.6,
    discard : 0.65,
    add : 0.6,
    goDown : 0.75,
    claim : 0.85,
    yourTurn : 0.5,
    youOut : 0.6,
    otherOut : 0.55,
    won : 0.65,
    lost : 0.55
};

/** The moments with a sound, each in public/audio/<sound>.mp3. */
export const SOUNDS = Object.keys(VOLUME) as Sound[];

const yourTurn = (view: GameView): boolean => view.phase === "draw" && view.turn === view.seat;

// How a round (or the game) ended, for you.
const ending = (view: GameView, out: number | null): Sound => {
    if (view.phase === "gameEnd") {
        let totals = view.seats.map(seat => seat.total);
        return (totals[view.seat] === Math.min(...totals)) ? "won" : "lost";
    }
    return (out === view.seat) ? "youOut" : "otherOut";
};

/** The sounds for what's happened since the last view (before), in order. Nothing for the first view. */
export const soundsFor = (before: GameView | null, view: GameView): Sound[] => {
    if (!before) return [];
    let sounds: Sound[] = [];
    let dealt = before.round !== view.round;
    if (dealt) sounds.push("deal");
    for (let entry of dealt ? view.log : view.log.slice(before.log.length)) {
        switch (entry.type) {
            case "draw": sounds.push((entry.from === "deck") ? "draw" : "take"); break;
            case "claim": sounds.push("claim"); break;
            case "discard": sounds.push("discard"); break;
            case "goDown": sounds.push("goDown"); break;
            case "add": sounds.push("add"); break;
            case "reshuffle": sounds.push("deal"); break;
            case "out": sounds.push(ending(view, entry.seat)); break;
            case "deckOut": sounds.push(ending(view, null)); break;
        }
    }
    if (view.claim?.canAnswer && !before.claim?.canAnswer) sounds.push("canClaim");
    if (yourTurn(view) && !(yourTurn(before) && before.round === view.round)) sounds.push("yourTurn");
    return sounds;
};
