// @vitest-environment node
import {memoryStore} from './store.ts';
import {createSettings, DEFAULT_HINTS} from './settings.ts';

it('remembers the levels you chose', async () => {
    const settings = createSettings(memoryStore());
    expect(await settings.levels()).toBeNull();
    settings.setLevels(["hard", "normal", "hard"]);
    expect(await settings.levels()).toEqual(["hard", "normal", "hard"]);
});

it('remembers who you chose to play, and ignores a line-up it can\'t use', async () => {
    const store = memoryStore();
    const settings = createSettings(store);
    expect(await settings.cast()).toBeNull();
    settings.setCast(["clara", "alan", "gemma"]);
    expect(await settings.cast()).toEqual(["clara", "alan", "gemma"]);
    await store.set("crafty-clara.cast", ["clara", "clara", "gemma"]);
    expect(await settings.cast()).toBeNull();
    await store.set("crafty-clara.cast", ["clara", "bob", "gemma"]);
    expect(await settings.cast()).toBeNull();
});

it('starts with the dots and the melds lighting up, but not the go-down hint, and remembers your hints', async () => {
    const settings = createSettings(memoryStore());
    expect(await settings.hints()).toEqual({fits : true, targets : true, ready : false});
    settings.setHints({fits : false, targets : false, ready : true});
    expect(await settings.hints()).toEqual({fits : false, targets : false, ready : true});
});

it('starts chatty, and remembers how much table talk you want', async () => {
    const store = memoryStore();
    const settings = createSettings(store);
    expect(await settings.talk()).toBe("chatty");
    settings.setTalk("quiet");
    expect(await settings.talk()).toBe("quiet");
    await store.set("crafty-clara.talk", "shouty");
    expect(await settings.talk()).toBe("chatty");
});

it('fills in any hint it has no choice for', async () => {
    const store = memoryStore();
    await store.set("crafty-clara.hints", {ready : true, fits : "yes"});
    expect(await createSettings(store).hints()).toEqual({...DEFAULT_HINTS, ready : true});
    await store.set("crafty-clara.hints", 7);
    expect(await createSettings(store).hints()).toEqual(DEFAULT_HINTS);
});
