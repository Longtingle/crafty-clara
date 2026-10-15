// The host runs a game. It holds the one true state, applies the commands
// that come from each seat, closes claim windows at their deadline, and sends
// every seat its view after each change. A seat is whatever is at the other
// end of a port: the person at this screen, a bot, or later someone online.
// The host doesn't know or mind which.

import {apply, createGame, expireClaims, type GameState, type Result} from '../engine/game.ts';
import {viewFor} from '../engine/view.ts';
import {systemClock, type Clock, type TimerId} from './clock.ts';
import type {ClientMessage, HostPort} from './protocol.ts';

export interface HostOptions {
    /** one per seat, in turn order */
    names?: string[];
    /** a random one if left out */
    seed?: number;
    /** how long the other players have to claim a discard (ms) */
    claimWindowMs?: number;
    clock?: Clock;
    /** a game to carry on, in place of dealing a new one with the options above */
    state?: GameState;
    /** told of every change to the state, to save the game */
    onChange?: (state: GameState) => void;
}

export interface Host {
    /** Seats whoever is at the other end of the port, in place of anyone already there, and sends them their view. */
    connect(seat: number, port: HostPort): void;
    /** the current state, for tests and debugging */
    state(): GameState;
    /** Ends the game: closes every port and cancels the claim deadline. */
    close(): void;
}

export const createHost = ({
    names = [],
    seed = Math.floor(Math.random() * 2 ** 32),
    claimWindowMs,
    clock = systemClock,
    state : from,
    onChange
}: HostOptions): Host => {
    let state = from ?? createGame({names, seed, claimWindowMs});
    let connections: ({port: HostPort; stop: () => void} | null)[] = state.seats.map(() => null);
    let deadline: TimerId | undefined;

    const sendView = (seat: number): void => {
        connections[seat]?.port.send({type : "view", view : viewFor(state, seat, clock.now())});
    };

    const update = (next: GameState): void => {
        state = next;
        watchDeadline();
        onChange?.(state);
        connections.forEach((_, seat) => sendView(seat));
    };

    // Closes the claim window when its deadline comes.
    const watchDeadline = (): void => {
        if (deadline !== undefined) clock.clearTimeout(deadline);
        deadline = undefined;
        if (!state.claim) return;
        deadline = clock.setTimeout(() => {
            deadline = undefined;
            let next = expireClaims(state, clock.now());
            // a timer can fire a moment early, and then it waits again
            if (next === state) watchDeadline();
            else update(next);
        }, state.claim.deadline - clock.now());
    };
    // a game carried on may have a claim window open
    watchDeadline();

    const receive = (seat: number, message: ClientMessage): void => {
        if (message.type !== "command") return;
        let result: Result;
        try {
            result = apply(state, seat, message.command, clock.now());
        } catch (error) {
            // the engine expects well-formed commands, and this one wasn't
            console.error(error);
            result = {ok : false, error : "Something went wrong with that move"};
        }
        if (result.ok) update(result.state);
        else connections[seat]?.port.send({type : "refused", command : message.command, error : result.error});
    };

    const disconnect = (seat: number): void => {
        connections[seat]?.stop();
        connections[seat]?.port.close();
        connections[seat] = null;
    };

    return {
        connect(seat, port) {
            if (!Number.isInteger(seat) || seat < 0 || seat >= state.seats.length) throw new Error("There's no seat " + seat);
            disconnect(seat);
            connections[seat] = {port, stop : port.listen(message => receive(seat, message))};
            sendView(seat);
        },
        state : () => state,
        close() {
            connections.forEach((_, seat) => disconnect(seat));
            if (deadline !== undefined) clock.clearTimeout(deadline);
            deadline = undefined;
        }
    };
};
