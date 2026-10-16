// @vitest-environment node
import {memoryStore} from './store.ts';
import {createSettings, DEFAULT_HINTS, DEFAULT_PREFERENCES} from './settings.ts';

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

it('starts with the dots and the melds lighting up, chatty, at normal speed and with sound', async () => {
    expect(await createSettings(memoryStore()).preferences()).toEqual({
        hints : {fits : true, targets : true, ready : false},
        talk : "chatty",
        speed : "normal",
        sound : true
    });
});

it('remembers each preference as you change it', async () => {
    const settings = createSettings(memoryStore());
    settings.setPreferences({hints : {fits : false, targets : false, ready : true}});
    settings.setPreferences({talk : "quiet", sound : false});
    settings.setPreferences({speed : "relaxed"});
    expect(await settings.preferences()).toEqual({
        hints : {fits : false, targets : false, ready : true},
        talk : "quiet",
        speed : "relaxed",
        sound : false
    });
});

it('keeps each preference where it always has, so earlier choices still count', async () => {
    const store = memoryStore();
    await store.set("crafty-clara.talk", "off");
    await store.set("crafty-clara.speed", "quick");
    await store.set("crafty-clara.sound", false);
    expect(await createSettings(store).preferences()).toMatchObject({talk : "off", speed : "quick", sound : false});
});

it('uses the default for a preference it no longer understands, and fills in any hint it has no choice for', async () => {
    const store = memoryStore();
    await store.set("crafty-clara.talk", "shouty");
    await store.set("crafty-clara.speed", "ludicrous");
    await store.set("crafty-clara.hints", {ready : true, fits : "yes"});
    expect(await createSettings(store).preferences()).toEqual({...DEFAULT_PREFERENCES, hints : {...DEFAULT_HINTS, ready : true}});
    await store.set("crafty-clara.hints", 7);
    expect((await createSettings(store).preferences()).hints).toEqual(DEFAULT_HINTS);
});
