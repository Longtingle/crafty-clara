// @vitest-environment node
import {startBot} from './host/bot-player.ts';
import {createTestClock} from './host/testing.ts';
import {memoryStore} from './storage/store.ts';
import {createSavedGame} from './storage/saved-game.ts';
import {createGameHistory} from './storage/history.ts';
import {startSession} from './session.ts';

const stores = () => {
    const store = memoryStore();
    return {savedGame : createSavedGame(store), history : createGameHistory(store)};
};

it('saves the game as it goes, and records it in your history when it ends', async () => {
    const clock = createTestClock();
    const {savedGame, history} = stores();
    const session = startSession({levels : ["hard", "normal", "hard"], seed : 4, savedGame, history, clock});
    expect(session.levels).toEqual([null, "hard", "normal", "hard"]);
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
    expect(games[0].players.map(player => [player.name, player.level])).toEqual([
        ["You", null], ["Opponent 1", "hard"], ["Opponent 2", "normal"], ["Opponent 3", "hard"]
    ]);
    expect(games[0].players[0].scores).toEqual(session.game.host.state().seats[0].scores);
});

it('carries on a saved game with the same opponents', async () => {
    const {savedGame, history} = stores();
    const first = startSession({levels : ["normal", "hard", "hard"], savedGame, history, clock : createTestClock()});
    const saved = (await savedGame.load())!;
    first.game.stop();

    const session = startSession({levels : ["normal", "normal", "normal"], from : saved, savedGame, history, clock : createTestClock()});
    expect(session.levels).toEqual([null, "normal", "hard", "hard"]);
    expect(session.game.host.state().seats).toEqual(saved.state.seats);
    session.game.stop();
});
