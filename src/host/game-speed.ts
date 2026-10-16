// How quickly a game against the bots goes: how long each bot pauses before
// its moves, and how long you have to claim a discard. Kept apart from the
// host and the bots, so the settings can show it without loading them.

import type {BotPace} from './bot-player.ts';

export type GameSpeed = "relaxed" | "normal" | "quick";

export const DEFAULT_SPEED: GameSpeed = "normal";

export const GAME_SPEEDS: Record<GameSpeed, {pace: BotPace; claimWindowMs: number}> = {
    relaxed : {pace : {draw : 1900, answer : 1400, move : 1500, ready : 0}, claimWindowMs : 10_000},
    normal : {pace : {draw : 1400, answer : 1200, move : 1100, ready : 0}, claimWindowMs : 8000},
    quick : {pace : {draw : 1000, answer : 1000, move : 800, ready : 0}, claimWindowMs : 6000}
};

export const isGameSpeed = (value: unknown): value is GameSpeed => value === "relaxed" || value === "normal" || value === "quick";
