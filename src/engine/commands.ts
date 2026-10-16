// A command as it arrives from a seat is anything at all until it's checked.
// parseCommand checks its shape and rebuilds it from the fields a command
// has, so nothing a seat makes up gets into the game, its log, or what the
// other seats are sent. The host checks every command before the engine
// applies it.

import {RUN, SET} from './cards.ts';
import type {Command, Target} from './game.ts';

// generous limits: a card's id is a few characters, and a hand a few dozen cards
const MAX_ID = 40;
const MAX_CARDS = 60;
const MAX_SETRUNS = 6;

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields => typeof value === "object" && value !== null && !Array.isArray(value);

const isId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= MAX_ID;

const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

const parseTarget = (value: unknown): Target | null =>
    (isObject(value) && isCount(value.seat) && isCount(value.index)) ? {seat : value.seat, index : value.index} : null;

const parseSetrun = (value: unknown): {type: typeof SET | typeof RUN; cards: string[]; from?: number} | null => {
    if (!isObject(value) || (value.type !== SET && value.type !== RUN)) return null;
    let {cards, from} = value;
    if (!Array.isArray(cards) || cards.length > MAX_CARDS || !cards.every(isId)) return null;
    if (from === undefined) return {type : value.type, cards : [...cards]};
    return (Number.isInteger(from) && (from as number) >= 1 && (from as number) <= 14) ? {type : value.type, cards : [...cards], from : from as number} : null;
};

/** The command, rebuilt from only the fields it has, or null if it isn't one. */
export const parseCommand = (value: unknown): Command | null => {
    if (!isObject(value)) return null;
    switch (value.type) {
        case "draw":
            return (value.from === "deck" || value.from === "discard") ? {type : "draw", from : value.from} : null;
        case "claim":
        case "pass":
        case "start":
        case "ready":
            return {type : value.type};
        case "discard":
            return isId(value.card) ? {type : "discard", card : value.card} : null;
        case "addToSetrun": {
            let target = parseTarget(value.target);
            if (!isId(value.card) || !target) return null;
            if (value.end === undefined) return {type : "addToSetrun", card : value.card, target};
            return (value.end === "low" || value.end === "high") ? {type : "addToSetrun", card : value.card, target, end : value.end} : null;
        }
        case "goDown": {
            if (!Array.isArray(value.setruns) || value.setruns.length > MAX_SETRUNS) return null;
            let setruns = value.setruns.map(parseSetrun);
            return setruns.every(setrun => setrun !== null) ? {type : "goDown", setruns} : null;
        }
        default:
            return null;
    }
};
