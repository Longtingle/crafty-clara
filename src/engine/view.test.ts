// @vitest-environment node
import {apply, createGame, type Command, type GameState, type Result} from './game.ts';
import {viewFor} from './view.ts';

const unwrap = (result: Result): GameState => {
    if (!result.ok) throw new Error(result.error);
    return result.state;
};
const play = (state: GameState, seat: number, command: Command, now = 0) => unwrap(apply(state, seat, command, now));

const newGame = () => createGame({names : ["Ann", "Bob", "Cat", "Dan"], seed : 3});

// The ids of every card whose face a view shows.
const faces = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.flatMap(faces);
    if (value && typeof value === "object") {
        let own = ("displayString" in value && "id" in value) ? [String(value.id)] : [];
        return [...own, ...Object.values(value).flatMap(faces)];
    }
    return [];
};

describe('viewFor', () => {
    it('shows your own cards, and only the ids of everyone else’s', () => {
        const state = newGame();
        const view = viewFor(state, 1, 0);
        expect(view.hand).toEqual(state.seats[1].hand);
        expect(view.seats[2].cards).toEqual(state.seats[2].hand.map(card => card.id));
        const shown = new Set(faces(view));
        expect(view.seats[1].cards.every(id => shown.has(id))).toBe(true);
        for (let seat of [0, 2, 3]) {
            expect(view.seats[seat].cards.filter(id => shown.has(id))).toEqual([]);
        }
    });

    it('shows how many cards are in the deck and the id of the top one, not the cards', () => {
        const state = newGame();
        const view = viewFor(state, 0, 0);
        expect(view.deck).toEqual({count : 55, top : state.deck[0].id, canDraw : true});
        const shown = new Set(faces(view));
        expect(state.deck.filter(card => shown.has(card.id))).toEqual([]);
    });

    it('hides the card another player drew from the deck', () => {
        const state = play(newGame(), 0, {type : "draw", from : "deck"});
        const drawn = state.seats[0].hand.at(-1);
        expect(viewFor(state, 0, 0).log).toEqual([{type : "draw", seat : 0, from : "deck", card : drawn}]);
        expect(viewFor(state, 1, 0).log).toEqual([{type : "draw", seat : 0, from : "deck", card : null}]);
    });

    it('shows a card taken from the discard pile to everyone', () => {
        const state = play(newGame(), 0, {type : "draw", from : "discard"});
        expect(viewFor(state, 2, 0).log[0]).toMatchObject({from : "discard", card : newGame().discard[0]});
    });

    it('tells each seat whether it can claim, and counts down', () => {
        let state = play(newGame(), 0, {type : "draw", from : "deck"}, 1000);
        expect(viewFor(state, 0, 1000).claim).toMatchObject({card : state.discard[0], seats : [1, 2, 3], canAnswer : false, closesIn : 6000});
        expect(viewFor(state, 1, 2500).claim).toMatchObject({canAnswer : true, answer : null, closesIn : 4500});
        state = play(state, 2, {type : "pass"}, 2500);
        expect(viewFor(state, 2, 2500).claim).toMatchObject({canAnswer : false, answer : "pass"});
        expect(viewFor(state, 3, 2500).claim).toMatchObject({canAnswer : true, answer : null});
    });

    it('survives being sent as JSON', () => {
        const state = play(newGame(), 0, {type : "draw", from : "deck"});
        for (let seat = 0; seat < 4; seat++) {
            const view = viewFor(state, seat, 0);
            expect(JSON.parse(JSON.stringify(view))).toEqual(view);
        }
    });
});
