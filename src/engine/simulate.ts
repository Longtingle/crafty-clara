// Plays whole games between bots with no timers, for tests and for trying
// out rule or bot changes. Time stands still until every seat is waiting on
// a claim window; then the clock jumps to its deadline.

import {apply, createGame, expireClaims, type GameState, type Result} from './game.ts';
import {viewFor} from './view.ts';
import {botMove} from './bot.ts';

export interface SimulationOptions {
    seats?: number;
    /** seats that never answer a claim, like a player who has stepped away */
    silent?: number[];
    /** a round that runs longer than this many turns counts as stalled */
    maxTurns?: number;
    /** called with every state the game passes through */
    onState?: (state: GameState) => void;
}

export interface SimulationResult {
    state: GameState;
    /** how many turns each round took */
    turns: number[];
    /** who went out in each round (null when the deck ran out) */
    wentOut: (number | null)[];
    /** whether the game stopped because a round ran past maxTurns */
    stalled: boolean;
}

const unwrap = (result: Result): GameState => {
    if (!result.ok) throw new Error(result.error);
    return result.state;
};

export const simulateGame = (seed: number, {seats = 4, silent = [], maxTurns = 1000, onState}: SimulationOptions = {}): SimulationResult => {
    let state = createGame({names : Array.from({length : seats}, (_, i) => "Bot " + (i + 1)), seed});
    let now = 0;
    let turns = [0];
    let wentOut: (number | null)[] = [];
    onState?.(state);

    while (state.phase !== "gameEnd") {
        let {round, phase} = state;
        let moved = false;
        for (let seat = 0; seat < seats && !moved; seat++) {
            let command = botMove(viewFor(state, seat, now));
            if (!command) continue;
            if (silent.includes(seat) && (command.type === "claim" || command.type === "pass")) continue;
            state = unwrap(apply(state, seat, command, now));
            if (command.type === "discard") turns[turns.length - 1]++;
            moved = true;
        }
        if (!moved) {
            if (!state.claim) throw new Error("Nobody can move");
            now = state.claim.deadline;
            state = expireClaims(state, now);
        }
        if (phase === "play" && (state.phase === "roundEnd" || state.phase === "gameEnd")) wentOut.push(state.wentOut);
        if (state.round !== round) turns.push(0);
        if (turns[turns.length - 1] > maxTurns) return {state, turns, wentOut, stalled : true};
        onState?.(state);
    }
    return {state, turns, wentOut, stalled : false};
};
