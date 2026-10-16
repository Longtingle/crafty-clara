// The host runs a game. It holds the one true state, applies the commands
// that come from each seat, closes claim windows and starts play at their
// deadlines, and sends every seat its view after each change. It passes on
// what each seat says to every seat (table talk), which isn't part of the
// game. A seat is whatever is at the other end of a port: the person at this
// screen, a bot, or later someone online. The host doesn't know or mind which.
//
// Nothing a seat sends is trusted: a command is checked (parseCommand), and
// so is a line of talk (parseLine), before anything is done with it.

import {apply, createGame, expire, nextDeadline, type Command, type GameState, type RefusalCode, type Result} from '../engine/game.ts';
import {parseCommand} from '../engine/commands.ts';
import {parseLine} from '../engine/catalogue.ts';
import {viewFor} from '../engine/view.ts';
import {systemClock, type Clock, type TimerId} from './clock.ts';
import {PROTOCOL, type HostPort, type SeatInfo} from './protocol.ts';

export interface HostOptions {
    /** one per seat, in turn order */
    names?: string[];
    /** who sits in each seat, besides their name; people, by default */
    seats?: SeatInfo[];
    /** a random one if left out */
    seed?: number;
    /** how long the other players have to claim a discard (ms) */
    claimWindowMs?: number;
    /** how long a claim window stays open at least, unless everyone has answered (ms) */
    claimShowMs?: number;
    /** how long everyone has to look over their hand at the start of each round (ms) */
    lookMs?: number;
    clock?: Clock;
    /** a game to carry on, in place of dealing a new one with the options above */
    state?: GameState;
    /** told of every change to the state, to save the game */
    onChange?: (state: GameState) => void;
}

/** Something that changed the game, and when, on the host's clock. */
export type JournalEntry =
    | {at: number; seat: number; command: Command}
    /** a deadline passed: a claim window closed, or play started */
    | {at: number; expire: true}
    | {at: number; claimTimes: {windowMs: number; showMs: number}};

/** Everything that happened to a game since the host took it on: enough to replay it exactly, for a bug report or a check. */
export interface Journal {
    start: GameState;
    entries: JournalEntry[];
}

/** The least time between two lines from one seat (ms): more are dropped. */
const TALK_GAP_MS = 800;

export interface Host {
    /**
     * Seats whoever is at the other end of the port, in place of anyone
     * already there. Once they say hello, they're welcomed and sent their view.
     */
    connect(seat: number, port: HostPort): void;
    /** the current state, for tests and debugging */
    state(): GameState;
    /** what has happened to the game so far */
    journal(): Journal;
    /** How long the claim windows from now on last, and stay open at least (ms). A window already open keeps its times. */
    setClaimTimes(windowMs: number, showMs: number): void;
    /** Ends the game: closes every port and cancels any deadline. */
    close(): void;
}

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields => typeof value === "object" && value !== null;

/** The state a journal leads to, applying each entry in turn. */
export const replay = ({start, entries}: Journal): GameState => entries.reduce((state: GameState, entry: JournalEntry): GameState => {
    if ("command" in entry) {
        let result = apply(state, entry.seat, entry.command, entry.at);
        if (!result.ok) throw new Error("Replaying a command that was refused: " + result.error);
        return result.state;
    }
    if ("expire" in entry) return expire(state, entry.at);
    return {...state, claimWindowMs : entry.claimTimes.windowMs, claimShowMs : entry.claimTimes.showMs};
}, start);

interface Connection {
    port: HostPort;
    /** once it has said hello, in the right version */
    welcomed: boolean;
    stop: () => void;
}

export const createHost = ({
    names = [],
    seats,
    seed = Math.floor(Math.random() * 2 ** 32),
    claimWindowMs,
    claimShowMs,
    lookMs,
    clock = systemClock,
    state : from,
    onChange
}: HostOptions): Host => {
    let state = from ?? createGame({names, seed, claimWindowMs, claimShowMs, lookMs, now : clock.now()});
    let sitting: SeatInfo[] = state.seats.map((_, seat) => seats?.[seat] ?? {level : null, character : null});
    let journal: Journal = {start : state, entries : []};
    let connections: (Connection | null)[] = state.seats.map(() => null);
    let deadline: TimerId | undefined;
    // when each seat last said something
    let spoke: number[] = state.seats.map(() => -Infinity);

    // to the seats that have been welcomed
    const welcomed = (): {seat: number; port: HostPort}[] =>
        connections.flatMap((connection, seat) => connection?.welcomed ? [{seat, port : connection.port}] : []);

    const sendView = (seat: number, port: HostPort): void => {
        port.send({type : "view", view : viewFor(state, seat, clock.now())});
    };

    const update = (next: GameState): void => {
        state = next;
        watchDeadline();
        onChange?.(state);
        for (let {seat, port} of welcomed()) sendView(seat, port);
    };

    // Closes the claim window, or starts play, when its deadline comes.
    const watchDeadline = (): void => {
        if (deadline !== undefined) clock.clearTimeout(deadline);
        deadline = undefined;
        let when = nextDeadline(state);
        if (when === null) return;
        deadline = clock.setTimeout(() => {
            deadline = undefined;
            let at = clock.now();
            let next = expire(state, at);
            // a timer can fire a moment early, and then it waits again
            if (next === state) {
                watchDeadline();
            } else {
                journal.entries.push({at, expire : true});
                update(next);
            }
        }, when - clock.now());
    };
    // a game carried on may have a deadline to come
    watchDeadline();

    const refuse = (port: HostPort, command: unknown, error: string, code: RefusalCode): void => {
        port.send({type : "refused", command, error, code});
    };

    const play = (seat: number, port: HostPort, sent: unknown): void => {
        let command = parseCommand(sent);
        if (!command) {
            refuse(port, sent, "That isn't a move in this game", "malformed");
            return;
        }
        let at = clock.now();
        let result: Result;
        try {
            result = apply(state, seat, command, at);
        } catch (error) {
            // the engine only gets well-formed commands, so this is a bug in it
            console.error(error);
            result = {ok : false, error : "Something went wrong with that move", code : "illegal"};
        }
        if (!result.ok) {
            refuse(port, sent, result.error, result.code);
            return;
        }
        journal.entries.push({at, seat, command});
        update(result.state);
    };

    const talk = (seat: number, sent: unknown): void => {
        let line = parseLine(sent, seat, state.seats.length, sitting[seat].character);
        if (!line || clock.now() - spoke[seat] < TALK_GAP_MS) return;
        spoke[seat] = clock.now();
        for (let {port} of welcomed()) {
            port.send({type : "said", seat, line, round : state.round, after : state.log.length});
        }
    };

    const receive = (seat: number, connection: Connection, message: unknown): void => {
        if (!isObject(message)) return;
        let {port} = connection;
        if (message.type === "hello") {
            if (message.protocol !== PROTOCOL) {
                // a page from before an update, or after one: it can't follow this game
                port.send({type : "mismatch", protocol : PROTOCOL});
                disconnect(seat);
                return;
            }
            if (connection.welcomed) return;
            connection.welcomed = true;
            port.send({type : "welcome", protocol : PROTOCOL, seat, seats : sitting});
            sendView(seat, port);
            return;
        }
        // nothing counts before hello
        if (!connection.welcomed) return;
        if (message.type === "command") play(seat, port, message.command);
        else if (message.type === "say") talk(seat, message.line);
    };

    const disconnect = (seat: number): void => {
        let connection = connections[seat];
        if (!connection) return;
        connections[seat] = null;
        connection.stop();
        connection.port.close();
    };

    return {
        connect(seat, port) {
            if (!Number.isInteger(seat) || seat < 0 || seat >= state.seats.length) throw new Error("There's no seat " + seat);
            disconnect(seat);
            let connection: Connection = {port, welcomed : false, stop : () => {}};
            let stopListening = port.listen(message => receive(seat, connection, message));
            // a seat that hangs up is no longer there to send to
            let stopWatching = port.onClose(() => {
                if (connections[seat] === connection) connections[seat] = null;
                connection.stop();
            });
            connection.stop = () => {
                stopListening();
                stopWatching();
            };
            connections[seat] = connection;
        },
        state : () => state,
        journal : () => ({start : journal.start, entries : [...journal.entries]}),
        setClaimTimes(windowMs, showMs) {
            if (windowMs === state.claimWindowMs && showMs === state.claimShowMs) return;
            journal.entries.push({at : clock.now(), claimTimes : {windowMs, showMs}});
            update({...state, claimWindowMs : windowMs, claimShowMs : showMs});
        },
        close() {
            connections.forEach((_, seat) => disconnect(seat));
            if (deadline !== undefined) clock.clearTimeout(deadline);
            deadline = undefined;
        }
    };
};
