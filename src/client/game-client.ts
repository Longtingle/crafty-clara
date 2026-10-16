// Your side of a game: the latest view the host sent your seat, the last
// command it refused, and what's been said at the table this round. React
// reads it through useGame (use-game.ts); each message replaces the snapshot
// whole, so a changed snapshot means a render.

import type {Command} from '../engine/game.ts';
import type {Heard} from '../engine/talk.ts';
import type {GameView} from '../engine/view.ts';
import type {SeatPort} from '../host/protocol.ts';

export interface Refusal {
    command: Command;
    error: string;
    /** counts up with each refusal, so the same message twice still shows as new */
    seq: number;
}

/** A line said at the table. */
export interface Talk extends Heard {
    /** counts up with each line, so each is new */
    seq: number;
}

/** The most lines of table talk kept. */
const KEEP_TALK = 30;

export interface GameSnapshot {
    /** null until the host's first message arrives */
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
}

export const createGameClient = (port: SeatPort): GameClient => {
    let snapshot: GameSnapshot = {view : null, refusal : null, talk : []};
    let listeners = new Set<() => void>();
    let seq = 0;
    let talkSeq = 0;

    port.listen(message => {
        if (message.type === "view") {
            snapshot = {...snapshot, view : message.view};
        } else if (message.type === "refused") {
            snapshot = {...snapshot, refusal : {command : message.command, error : message.error, seq : ++seq}};
        } else {
            let {seat, line, round, after} = message;
            let talk = [...snapshot.talk.filter(said => said.round === round), {seat, line, round, after, seq : ++talkSeq}];
            snapshot = {...snapshot, talk : talk.slice(-KEEP_TALK)};
        }
        for (let listener of listeners) listener();
    });

    return {
        getSnapshot : () => snapshot,
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        send(command) {
            port.send({type : "command", command});
        }
    };
};
