// The messages between a seat and the host. They cross the transport as
// JSON, so they hold only plain data.
//
// A seat says hello first, with the version of these messages it speaks.
// The host answers with a welcome (which seat it is, and who sits where) and
// then its view, or, to a seat that speaks another version, says so and
// hangs up. A page left open from before an update can then say "reload"
// rather than misread what it's sent.

import type {Command, RefusalCode} from '../engine/game.ts';
import type {Line} from '../engine/catalogue.ts';
import type {GameView} from '../engine/view.ts';
import type {BotLevel} from '../engine/levels.ts';
import type {CharacterId} from '../engine/cast.ts';
import type {Port} from './transport.ts';

/** The version of these messages. Bump it with any change an older seat or host would misread. */
export const PROTOCOL = 1;

/**
 * Who sits in a seat, besides the name the view gives: a bot's level (null
 * for a person), and who they are, if one of the cast.
 */
export interface SeatInfo {
    level: BotLevel | null;
    character: CharacterId | null;
}

/** From a seat to the host: hello, a move, or a line of table talk. */
export type ClientMessage =
    | {type: "hello"; protocol: number}
    | {type: "command"; command: Command}
    | {type: "say"; line: Line};

/** The answer to hello: which seat this is, and who sits where. */
export interface WelcomeMessage {
    type: "welcome";
    protocol: number;
    seat: number;
    seats: SeatInfo[];
}

/** The answer to a hello in another version: the host speaks `protocol`, and hangs up. */
export interface MismatchMessage {
    type: "mismatch";
    protocol: number;
}

/** The seat's view of the game, sent after the welcome and after every change. */
export interface ViewMessage {
    type: "view";
    view: GameView;
}

/** A command the host couldn't carry out, and why. Nothing changed. */
export interface RefusedMessage {
    type: "refused";
    /** as the seat sent it, which may be anything */
    command: unknown;
    error: string;
    code: RefusalCode;
}

/**
 * A line of table talk, to every seat: who said it, and when, by the
 * round's log (how many entries came before it). It isn't part of the game.
 */
export interface SaidMessage {
    type: "said";
    seat: number;
    line: Line;
    round: number;
    after: number;
}

/** From the host to a seat. */
export type HostMessage = WelcomeMessage | MismatchMessage | ViewMessage | RefusedMessage | SaidMessage;

/** A seat's end of its connection to the host. */
export type SeatPort = Port<ClientMessage, HostMessage>;

/** The host's end of its connection to a seat. */
export type HostPort = Port<HostMessage, ClientMessage>;
