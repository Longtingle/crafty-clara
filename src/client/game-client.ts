// Your side of a game: the latest view the host sent your seat, and the last
// command it refused. React reads it through useGame (use-game.js); each
// message replaces the snapshot whole, so a changed snapshot means a render.

import type {Command} from '../engine/game.ts';
import type {GameView} from '../engine/view.ts';
import type {SeatPort} from '../host/protocol.ts';

export interface Refusal {
    command: Command;
    error: string;
    /** counts up with each refusal, so the same message twice still shows as new */
    seq: number;
}

export interface GameSnapshot {
    /** null until the host's first message arrives */
    view: GameView | null;
    refusal: Refusal | null;
}

export interface GameClient {
    getSnapshot(): GameSnapshot;
    /** Calls the listener after each message. Returns a function that stops it. */
    subscribe(listener: () => void): () => void;
    send(command: Command): void;
}

export const createGameClient = (port: SeatPort): GameClient => {
    let snapshot: GameSnapshot = {view : null, refusal : null};
    let listeners = new Set<() => void>();
    let seq = 0;

    port.listen(message => {
        snapshot = (message.type === "view")
            ? {...snapshot, view : message.view}
            : {...snapshot, refusal : {command : message.command, error : message.error, seq : ++seq}};
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
