// The messages between a seat and the host. They cross the transport as
// JSON, so they hold only plain data.

import type {Command} from '../engine/game.ts';
import type {Line} from '../engine/talk.ts';
import type {GameView} from '../engine/view.ts';
import type {Port} from './transport.ts';

/** From a seat to the host: a move, or a line of table talk. */
export type ClientMessage = {type: "command"; command: Command} | {type: "say"; line: Line};

/** The seat's view of the game, sent when it connects and after every change. */
export interface ViewMessage {
    type: "view";
    view: GameView;
}

/** A command the host couldn't carry out, and why. Nothing changed. */
export interface RefusedMessage {
    type: "refused";
    command: Command;
    error: string;
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
export type HostMessage = ViewMessage | RefusedMessage | SaidMessage;

/** A seat's end of its connection to the host. */
export type SeatPort = Port<ClientMessage, HostMessage>;

/** The host's end of its connection to a seat. */
export type HostPort = Port<HostMessage, ClientMessage>;
