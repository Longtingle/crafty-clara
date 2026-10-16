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

it('brings a game saved by an older version up to date', async () => {
    const store = memoryStore();
    const old = JSON.parse(JSON.stringify(aSave()));
    for (let key of ["version", "claimShowMs", "lookMs", "look"]) delete old.state[key];
    await store.set("crafty-clara.game", {version : 1, game : old});
    expect(await createSavedGame(store).load()).toEqual(aSave());
});

it('puts right a bot whose level or character this version does not know', async () => {
    const store = memoryStore();
    const save = {...aSave(), bots : [
        {level : "fiendish", seed : 1, risk : 0.5, character : "clara"},
        {level : "hard", seed : 2, character : "zebedee"},
        {level : "normal", seed : 3, risk : 0.1}
    ]};
    await store.set("crafty-clara.game", {version : 1, game : save});
    expect((await createSavedGame(store).load())?.bots).toEqual([
        {level : "normal", seed : 1, risk : 0.5, character : "clara"},
        {level : "hard", seed : 2},
        {level : "normal", seed : 3, risk : 0.1}
    ]);
    // a bot with no seed can't play
    await store.set("crafty-clara.game", {version : 1, game : {...save, bots : [{level : "hard"}, ...save.bots.slice(1)]}});
    expect(await createSavedGame(store).load()).toBeNull();
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
