// @vitest-environment node
import {simulateGame} from '@/engine/simulate.ts';
import {viewFor} from '@/engine/view.ts';
import {memoryStore} from './store.ts';
import type {SeatInfo} from '@/host/protocol.ts';
import {createGameHistory, gameRecord, type GameRecord} from './history.ts';

const record = (finishedAt: number): GameRecord => ({finishedAt, seat : 0, players : [], outs : []});

it('records what happened in a finished game, round by round', () => {
    const {state} = simulateGame(5);
    const view = viewFor(state, 0, 0);
    const seats = [null, "hard", "normal", "hard"].map(level => ({level, character : null}) as SeatInfo);
    const kept = gameRecord(view, seats, 1234);
    expect(kept).toMatchObject({finishedAt : 1234, seat : 0, outs : state.outs});
    // each record has a name of its own
    expect(kept.id).toEqual(expect.any(String));
    expect(gameRecord(view, seats, 1234).id).not.toBe(kept.id);
    expect(kept.players.map(player => player.level)).toEqual([null, "hard", "normal", "hard"]);
    expect(kept.players[2]).toEqual({
        name : state.seats[2].name,
        level : "normal",
        scores : state.seats[2].scores,
        downs : state.seats[2].downs
    });
    expect(kept.outs).toHaveLength(7);
    // whoever went out of a round got down in it, and scored nothing
    kept.outs.forEach((seat, round) => {
        if (seat === null) return;
        expect(kept.players[seat].downs[round]).toBe(true);
        expect(kept.players[seat].scores[round]).toBe(0);
    });
});

it('keeps your games, oldest first, as many as it keeps', async () => {
    const history = createGameHistory(memoryStore());
    expect(await history.list()).toEqual([]);
    // added together, as two finishing at once would be
    await Promise.all([history.add(record(1)), history.add(record(2))]);
    expect((await history.list()).map(game => game.finishedAt)).toEqual([1, 2]);

    // a game still being added is listed
    void history.add(record(3));
    expect(await history.list()).toHaveLength(3);

    await Promise.all(Array.from({length : 1000}, (_, i) => history.add(record(i + 3))));
    const games = await history.list();
    expect(games).toHaveLength(1000);
    expect(games[0].finishedAt).toBe(3);
    expect(games.at(-1)!.finishedAt).toBe(1002);
});

it('leaves alone a history from a version it does not know', async () => {
    const store = memoryStore();
    const newer = {version : 2, games : [{played : "differently"}]};
    await store.set("crafty-clara.history", newer);
    const history = createGameHistory(store);
    expect(await history.list()).toEqual([]);
    await history.add(record(1));
    expect(await store.get("crafty-clara.history")).toEqual(newer);
});
