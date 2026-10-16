// Your side of a game: the connection's status, who sits where, the latest
// view the host sent your seat, the last command it refused, and what's been
// said at the table this round. React reads it through useGame
// (use-game.ts); each message replaces the snapshot whole, so a changed
// snapshot means a render.

import type {Command, RefusalCode} from '../engine/game.ts';
import {lineText, meaning} from '../engine/catalogue.ts';
import type {Heard} from '../engine/talk.ts';
import type {GameView} from '../engine/view.ts';
import {PROTOCOL, type SeatInfo, type SeatPort} from '../host/protocol.ts';

export interface Refusal {
    /** as you sent it */
    command: unknown;
    error: string;
    code: RefusalCode;
    /** counts up with each refusal, so the same message twice still shows as new */
    seq: number;
}

/** A line said at the table, as you hear it. */
export interface Talk extends Heard {
    /** counts up with each line, so each is new */
    seq: number;
    /** its words, with names filled in from where you sit, and yours left out */
    text: string;
    /** said at a big moment (or in answer to one), so it shows even when the talk is turned down */
    big: boolean;
}

/**
 * connecting until the host welcomes you; open; closed once the connection
 * has; or mismatch, when the host speaks another version of the messages
 * (a page left open from before an update), which a reload puts right.
 */
export type ConnectionStatus = "connecting" | "open" | "closed" | "mismatch";

/** The most lines of table talk kept. */
const KEEP_TALK = 30;

export interface GameSnapshot {
    status: ConnectionStatus;
    /** who sits in each seat, by seat, once you're welcomed */
    seats: SeatInfo[] | null;
    /** null until the host's first view arrives */
    view: GameView | null;
    refusal: Refusal | null;
    /** what's been said this round, oldest first */
    talk: Talk[];
}

export interface GameClient {
    getSnapshot(): GameSnapshot;
    /** Calls the listener after each message. Returns a function that stops it. */
    subscribe(listener: () => void): () => void;
    send(command: Command): void;
    /** Hangs up. */
    close(): void;
}

export const createGameClient = (port: SeatPort): GameClient => {
    let snapshot: GameSnapshot = {status : "connecting", seats : null, view : null, refusal : null, talk : []};
    let listeners = new Set<() => void>();
    let seat: number | null = null;
    let seq = 0;
    let talkSeq = 0;

    const change = (next: Partial<GameSnapshot>): void => {
        snapshot = {...snapshot, ...next};
        for (let listener of listeners) listener();
    };

    // a seat's name as you hear it: yours is left out
    const nameOf = (other: number): string | null =>
        (other === (seat ?? snapshot.view?.seat)) ? null : (snapshot.view?.seats[other]?.name ?? null);

    let stopListening = port.listen(message => {
        switch (message.type) {
            case "welcome":
                seat = message.seat;
                change({status : "open", seats : message.seats});
                break;
            case "mismatch":
                change({status : "mismatch"});
                break;
            case "view":
                change({view : message.view});
                break;
            case "refused":
                change({refusal : {command : message.command, error : message.error, code : message.code, seq : ++seq}});
                break;
            case "said": {
                let {seat : speaker, line, round, after} = message;
                let said: Talk = {seat : speaker, line, round, after, seq : ++talkSeq, text : lineText(line, nameOf), big : meaning(line).big};
                change({talk : [...snapshot.talk.filter(old => old.round === round), said].slice(-KEEP_TALK)});
                break;
            }
        }
    });
    let stopWatching = port.onClose(() => {
        if (snapshot.status !== "mismatch") change({status : "closed"});
    });
    port.send({type : "hello", protocol : PROTOCOL});

    return {
        getSnapshot : () => snapshot,
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        send(command) {
            port.send({type : "command", command});
        },
        close() {
            stopListening();
            stopWatching();
            port.close();
            change({status : "closed"});
        }
    };
};
