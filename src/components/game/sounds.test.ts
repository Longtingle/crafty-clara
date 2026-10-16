// @vitest-environment node
import {apply, createGame, type Command, type GameState} from '@/engine/game.ts';
import {viewFor, type GameView} from '@/engine/view.ts';
import {soundsFor} from './sounds.ts';

const play = (state: GameState, seat: number, command: Command): GameState => {
    let result = apply(state, seat, command, 0);
    if (!result.ok) throw new Error(result.error);
    return result.state;
};

// you play first
const newGame = () => createGame({names : ["You", "Ann", "Bob", "Cat"], seed : 1});

it('makes no sound for the first view, nor for nothing new', () => {
    const view = viewFor(newGame(), 0, 0);
    expect(soundsFor(null, view)).toEqual([]);
    expect(soundsFor(view, view)).toEqual([]);
});

it('deals each round, and tells you when your turn comes', () => {
    const view = viewFor(newGame(), 0, 0);
    expect(soundsFor({...view, round : view.round - 1}, view)).toEqual(["deal", "yourTurn"]);
});

it("sounds each move, and tells you when there's a discard you could claim", () => {
    const start = newGame();
    const drawn = play(start, 0, {type : "draw", from : "deck"});
    // Ann may claim the turned-up card
    expect(soundsFor(viewFor(start, 1, 0), viewFor(drawn, 1, 0))).toEqual(["draw", "canClaim"]);

    const claimed = play(drawn, 1, {type : "claim"});
    expect(soundsFor(viewFor(drawn, 0, 0), viewFor(claimed, 0, 0))).toEqual(["claim"]);

    // your discard, and then it's Ann's turn
    const discarded = play(claimed, 0, {type : "discard", card : claimed.seats[0].hand[0].id});
    expect(soundsFor(viewFor(claimed, 1, 0), viewFor(discarded, 1, 0))).toEqual(["discard", "yourTurn"]);
    expect(soundsFor(viewFor(claimed, 2, 0), viewFor(discarded, 2, 0))).toEqual(["discard"]);

    const taken = play(discarded, 1, {type : "draw", from : "discard"});
    expect(soundsFor(viewFor(discarded, 0, 0), viewFor(taken, 0, 0))).toEqual(["take"]);
});

it("ends a round with your going out, or someone else's, and the game with how you did", () => {
    const view = viewFor(newGame(), 0, 0);
    const ended = (out: number | null, phase: GameView["phase"], totals = [0, 0, 0, 0]): GameView => ({
        ...view,
        phase,
        log : [...view.log, (out === null) ? {type : "deckOut", seat : 1} : {type : "out", seat : out}],
        seats : view.seats.map((seat, index) => ({...seat, total : totals[index]}))
    });
    expect(soundsFor(view, ended(0, "roundEnd"))).toEqual(["youOut"]);
    expect(soundsFor(view, ended(2, "roundEnd"))).toEqual(["otherOut"]);
    expect(soundsFor(view, ended(null, "roundEnd"))).toEqual(["otherOut"]);
    expect(soundsFor(view, ended(2, "gameEnd", [40, 90, 60, 75]))).toEqual(["won"]);
    expect(soundsFor(view, ended(0, "gameEnd", [80, 90, 60, 75]))).toEqual(["lost"]);
});
