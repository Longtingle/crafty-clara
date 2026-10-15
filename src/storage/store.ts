// Somewhere to keep small pieces of data between visits, by key. Each place
// the game runs has its own: the browser's storage on the web (browserStore),
// the phone's own storage in an app, memory in tests (memoryStore). The rest
// of the game sees only this interface, so it doesn't mind which.
//
// It's asynchronous because every kind of storage but the browser's is.
// Values are anything JSON can hold. A store that can't keep something
// (storage blocked, or full) lets it go quietly: losing a save is better
// than a crash.

export interface KeyValueStore {
    /** the value kept under key, or null if there isn't one */
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    remove(key: string): Promise<void>;
}

/** The browser's localStorage, holding each value as JSON. */
export const browserStore = (storage?: Storage): KeyValueStore => {
    // where storage is blocked, even reading window.localStorage throws
    const local = (): Storage => storage ?? window.localStorage;
    return {
        async get(key) {
            try {
                let text = local().getItem(key);
                return (text === null) ? null : JSON.parse(text);
            } catch {
                return null;
            }
        },
        async set(key, value) {
            try {
                local().setItem(key, JSON.stringify(value));
            } catch {
                // not kept
            }
        },
        async remove(key) {
            try {
                local().removeItem(key);
            } catch {
                // nothing to remove
            }
        }
    };
};

/** A store in memory, for tests. Values go through JSON, as they would in storage. */
export const memoryStore = (): KeyValueStore => {
    let data = new Map<string, string>();
    return {
        get : async key => {
            let text = data.get(key);
            return (text === undefined) ? null : JSON.parse(text);
        },
        set : async (key, value) => {
            data.set(key, JSON.stringify(value));
        },
        remove : async key => {
            data.delete(key);
        }
    };
};
