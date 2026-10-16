// The lines of table talk you've heard lately, by id, so the cast don't say
// the same things game after game. The newest are kept.

import type {KeyValueStore} from './store.ts';

const KEY = "crafty-clara.heard";
const KEEP = 300;

export interface HeardLines {
    /** the lines heard lately, oldest first, including any still being added */
    list(): Promise<string[]>;
    add(id: string): void;
}

export const createHeardLines = (store: KeyValueStore): HeardLines => {
    const read = async (): Promise<string[]> => {
        let saved = await store.get(KEY);
        return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
    };
    // one change at a time, so none is lost
    let writing = Promise.resolve();
    return {
        list : async () => {
            await writing;
            return read();
        },
        add(id) {
            writing = writing
                .then(async () => {
                    let ids = (await read()).filter(old => old !== id);
                    await store.set(KEY, [...ids, id].slice(-KEEP));
                })
                .catch(() => {});
        }
    };
};
