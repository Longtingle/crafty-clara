// @vitest-environment node
import {memoryStore} from './store.ts';
import {createSettings, DEFAULT_HINTS} from './settings.ts';

it('remembers the levels you chose', async () => {
    const settings = createSettings(memoryStore());
    expect(await settings.levels()).toBeNull();
    settings.setLevels(["hard", "normal", "hard"]);
    expect(await settings.levels()).toEqual(["hard", "normal", "hard"]);
});

it('starts with the dots and the melds lighting up, but not the go-down hint, and remembers your hints', async () => {
    const settings = createSettings(memoryStore());
    expect(await settings.hints()).toEqual({fits : true, targets : true, ready : false});
    settings.setHints({fits : false, targets : false, ready : true});
    expect(await settings.hints()).toEqual({fits : false, targets : false, ready : true});
});

it('fills in any hint it has no choice for', async () => {
    const store = memoryStore();
    await store.set("crafty-clara.hints", {ready : true, fits : "yes"});
    expect(await createSettings(store).hints()).toEqual({...DEFAULT_HINTS, ready : true});
    await store.set("crafty-clara.hints", 7);
    expect(await createSettings(store).hints()).toEqual(DEFAULT_HINTS);
});
