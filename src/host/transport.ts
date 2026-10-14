// How a seat and the host talk. Each end of a connection is a Port. For now
// both ends are in the page (createLocalPair); later a WebSocket can be
// wrapped as a Port, and neither the host nor the seats will know the
// difference.

import {systemClock, type Clock} from './clock.ts';

/** One end of a connection: it sends Out and receives In. */
export interface Port<Out, In> {
    send(message: Out): void;
    /** Calls the listener with each message that arrives. Returns a function that stops listening. */
    listen(listener: (message: In) => void): () => void;
    /** Closes the connection: nothing more is delivered either way. */
    close(): void;
}

/**
 * Both ends of a connection within the page. A message arrives a moment after
 * it is sent, never during `send`, and as a copy made through JSON, the way it
 * would cross a socket. So nothing can come to rely on sharing objects with
 * the other end, or on a reply coming back at once.
 */
export const createLocalPair = <A, B>(clock: Clock = systemClock): [Port<A, B>, Port<B, A>] => {
    let closed = false;
    let aListeners = new Set<(message: B) => void>();
    let bListeners = new Set<(message: A) => void>();

    const end = <Out, In>(listeners: Set<(message: In) => void>, peer: Set<(message: Out) => void>): Port<Out, In> => ({
        send(message) {
            if (closed) return;
            let text = JSON.stringify(message);
            clock.setTimeout(() => {
                if (closed) return;
                for (let listener of peer) listener(JSON.parse(text));
            }, 0);
        },
        listen(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        close() {
            closed = true;
        }
    });
    return [end(aListeners, bListeners), end(bListeners, aListeners)];
};
