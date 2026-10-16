// The host runs a game. It holds the one true state, applies the commands
// that come from each seat, closes claim windows and starts play at their
// deadlines, and sends every seat its view after each change. It passes on
// what each seat says to every seat (table talk), which isn't part of the
// game. A seat is whatever is at the other end of a port: the person at this
// screen, a bot, or later someone online. The host doesn't know or mind which.

import {apply, createGame, expire, nextDeadline, type GameState, type Result} from '../engine/game.ts';
import type {Line} from '../engine/talk.ts';
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
    /** how long everyone has to look over their hand at the start of each round (ms) */
    lookMs?: number;
    clock?: Clock;
    /** a game to carry on, in place of dealing a new one with the options above */
    state?: GameState;
    /** told of every change to the state, to save the game */
    onChange?: (state: GameState) => void;
}

/** The least time between two lines from one seat (ms): more are dropped. */
const TALK_GAP_MS = 800;

// Whether a message's line is fit to pass on: plain, short text.
const isLine = (line: unknown): line is Line => {
    let {id, text, to, big, invites, replies} = (line ?? {}) as Record<string, unknown>;
    let short = (value: unknown, length: number): boolean => typeof value === "string" && value.length <= length;
    return short(id, 100) && short(text, 200) &&
        (to === undefined || Number.isInteger(to)) &&
        (big === undefined || typeof big === "boolean") &&
        (invites === undefined || ["dealer", "doubt", "comeback", "groan"].includes(invites as string)) &&
        (replies === undefined || (Array.isArray(replies) && replies.length <= 5 && replies.every(reply => short(reply, 200))));
};

export interface Host {
    /** Seats whoever is at the other end of the port, in place of anyone already there, and sends them their view. */
    connect(seat: number, port: HostPort): void;
    /** the current state, for tests and debugging */
    state(): GameState;
    /** How long the claim windows from now on last (ms). A window already open keeps its deadline. */
    setClaimWindow(ms: number): void;
    /** Ends the game: closes every port and cancels any deadline. */
    close(): void;
}

export const createHost = ({
    names = [],
    seed = Math.floor(Math.random() * 2 ** 32),
    claimWindowMs,
    lookMs,
    clock = systemClock,
    state : from,
    onChange
}: HostOptions): Host => {
    let state = from ?? createGame({names, seed, claimWindowMs, lookMs, now : clock.now()});
    let connections: ({port: HostPort; stop: () => void} | null)[] = state.seats.map(() => null);
    let deadline: TimerId | undefined;
    // when each seat last said something
    let spoke: number[] = state.seats.map(() => -Infinity);

    const sendView = (seat: number): void => {
        connections[seat]?.port.send({type : "view", view : viewFor(state, seat, clock.now())});
    };

    const update = (next: GameState): void => {
        state = next;
        watchDeadline();
        onChange?.(state);
        connections.forEach((_, seat) => sendView(seat));
    };

    // Closes the claim window, or starts play, when its deadline comes.
    const watchDeadline = (): void => {
        if (deadline !== undefined) clock.clearTimeout(deadline);
        deadline = undefined;
        let when = nextDeadline(state);
        if (when === null) return;
        deadline = clock.setTimeout(() => {
            deadline = undefined;
            let next = expire(state, clock.now());
            // a timer can fire a moment early, and then it waits again
            if (next === state) watchDeadline();
            else update(next);
        }, when - clock.now());
    };
    // a game carried on may have a deadline to come
    watchDeadline();

    const talk = (seat: number, line: unknown): void => {
        if (!isLine(line) || clock.now() - spoke[seat] < TALK_GAP_MS) return;
        spoke[seat] = clock.now();
        for (let connection of connections) {
            connection?.port.send({type : "said", seat, line, round : state.round, after : state.log.length});
        }
    };

    const receive = (seat: number, message: ClientMessage): void => {
        if (message.type === "say") {
            talk(seat, message.line);
            return;
        }
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
        setClaimWindow(ms) {
            if (ms !== state.claimWindowMs) update({...state, claimWindowMs : ms});
        },
        close() {
            connections.forEach((_, seat) => disconnect(seat));
            if (deadline !== undefined) clock.clearTimeout(deadline);
            deadline = undefined;
        }
    };
};
