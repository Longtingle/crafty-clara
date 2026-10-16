// @vitest-environment node
import {startBot} from './host/bot-player.ts';
import {createTestClock} from './host/testing.ts';
import {memoryStore} from './storage/store.ts';
import {createSavedGame} from './storage/saved-game.ts';
import {createGameHistory} from './storage/history.ts';
import {createHeardLines} from './storage/heard-lines.ts';
import {startSession} from './session.ts';

const stores = () => {
    const store = memoryStore();
    return {savedGame : createSavedGame(store), history : createGameHistory(store)};
};

it('saves the game as it goes, and records it in your history when it ends', async () => {
    const clock = createTestClock();
    const {savedGame, history} = stores();
    const session = startSession({cast : ["julie", "chris", "cis"], levels : ["hard", "normal", "hard"], seed : 4, savedGame, history, clock});
    expect(session.seats).toEqual([
        {level : null, character : null},
        {level : "hard", character : "julie"},
        {level : "normal", character : "chris"},
        {level : "hard", character : "cis"}
    ]);
    expect((await savedGame.load())?.state.round).toBe(0);

    // you're played by a bot too
    startBot(session.game.port, {clock});
    clock.advance(60_000);
    expect(await savedGame.load()).toMatchObject({state : session.game.host.state()});

    clock.runAll();
    expect(session.game.host.state().phase).toBe("gameEnd");
    expect(await savedGame.load()).toBeNull();
    const games = await history.list();
    expect(games).toHaveLength(1);
    expect(games[0].players.map(player => [player.name, player.level, player.character])).toEqual([
        ["You", null, undefined], ["Julie", "hard", "julie"], ["Chris", "normal", "chris"], ["Cis", "hard", "cis"]
    ]);
    expect(games[0].players[0].scores).toEqual(session.game.host.state().seats[0].scores);
});

it('keeps the table talk heard, so the cast keep off it next time', async () => {
    const clock = createTestClock();
    const {savedGame, history} = stores();
    const heardLines = createHeardLines(memoryStore());
    const session = startSession({cast : ["clara", "chris", "gemma"], seed : 3, savedGame, history, heardLines, heard : [], clock});
    startBot(session.game.port, {clock});
    clock.runAll();
    const heard = await heardLines.list();
    expect(heard.length).toBeGreaterThan(20);
    expect(heard.every(id => /^(clara|chris|gemma)\./.test(id))).toBe(true);
});

it('carries on a saved game with the same opponents', async () => {
    const {savedGame, history} = stores();
    const first = startSession({cast : ["vena", "alan", "gemma"], levels : ["normal", "hard", "hard"], savedGame, history, clock : createTestClock()});
    const saved = (await savedGame.load())!;
    first.game.stop();

    const session = startSession({cast : ["clara", "steve", "julie"], levels : ["normal", "normal", "normal"], from : saved, savedGame, history, clock : createTestClock()});
    expect(session.seats).toEqual([
        {level : null, character : null},
        {level : "normal", character : "vena"},
        {level : "hard", character : "alan"},
        {level : "hard", character : "gemma"}
    ]);
    expect(session.game.host.state().seats).toEqual(saved.state.seats);
    session.game.stop();
});
