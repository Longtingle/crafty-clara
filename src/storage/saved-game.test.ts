// @vitest-environment node
import {createGame} from '@/engine/game.ts';
import type {LocalGameSave} from '@/host/local-game.ts';
import {memoryStore, type KeyValueStore} from './store.ts';
import {createSavedGame} from './saved-game.ts';

const NAMES = ["You", "Opponent 1", "Opponent 2", "Opponent 3"];
const aSave = (savedAt = 1000): LocalGameSave => ({
    state : createGame({names : NAMES, seed : 1}),
    bots : [1, 2, 3].map(seed => ({level : "normal", seed, risk : 0.5})),
    savedAt
});

it('keeps the game in progress until it is forgotten', async () => {
    const saved = createSavedGame(memoryStore());
    expect(await saved.load()).toBeNull();
    saved.save(aSave());
    expect(await saved.load()).toEqual(aSave());
    saved.save(null);
    expect(await saved.load()).toBeNull();
});

it('drops a save from another version, or one that is the wrong shape', async () => {
    const store = memoryStore();
    const saved = createSavedGame(store);
    await store.set("crafty-clara.game", {version : 0, game : aSave()});
    expect(await saved.load()).toBeNull();
    await store.set("crafty-clara.game", {version : 1, game : {...aSave(), bots : []}});
    expect(await saved.load()).toBeNull();
    await store.set("crafty-clara.game", "nonsense");
    expect(await saved.load()).toBeNull();
});

it('writes one save at a time, skipping any a newer one replaces', async () => {
    const store = memoryStore();
    const writes: unknown[] = [];
    // a store that takes its time
    const slow: KeyValueStore = {
        ...store,
        set : async (key, value) => {
            await new Promise(resolve => setTimeout(resolve, 5));
            writes.push((value as {game: LocalGameSave}).game.savedAt);
            return store.set(key, value);
        }
    };
    const saved = createSavedGame(slow);
    for (let time = 1; time <= 10; time++) saved.save(aSave(time));
    expect((await saved.load())?.savedAt).toBe(10);
    expect(writes).toEqual([10]);
});
