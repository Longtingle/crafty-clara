// @vitest-environment node
import {RUN, SET, type Card, type SetrunType} from '@/engine/cards.ts';
import {checkSetrun} from '@/engine/setruns.ts';
import {requirementText, shortName} from '@/engine/card-names.ts';
import {apply, createGame, expireClaims, type Command, type GameState} from '@/engine/game.ts';
import {viewFor} from '@/engine/view.ts';
import {cards} from '@/engine/testing.ts';
import {yourTurn} from './your-turn.ts';

const newGame = () => createGame({names : ["You", "Opponent 1", "Opponent 2", "Opponent 3"], seed : 5});

const play = (state: GameState, seat: number, command: Command): GameState => {
    let result = apply(state, seat, command, 0);
    if (!result.ok) throw new Error(result.error);
    return result.state;
};

const setrun = (str: string, type: SetrunType) => {
    let result = checkSetrun(cards(str), type);
    if (!result.valid) throw new Error(str + " isn't a valid " + type);
    return result.setrun;
};

// Your turn after drawing: you hold `hand`, and you and Opponent 1 are down.
const building = (hand: Card[]): GameState => {
    let state = play(newGame(), 0, {type : "draw", from : "discard"});
    state.seats[0].hand = hand;
    state.seats[0].isDown = true;
    state.seats[0].table = [setrun("7C 7D 7S", SET)];
    state.seats[1].isDown = true;
    state.seats[1].table = [setrun("4S 1H 6S 7S", RUN)]; // the A♥ as 5♠
    return state;
};

describe('yourTurn', () => {
    it('offers the deck and the discard pile before you draw', () => {
        const view = viewFor(newGame(), 0, 0);
        const turn = yourTurn(view, view.hand, null);
        expect(turn).toMatchObject({drawing : true, playing : false, deckLive : true, selected : null});
        expect(turn.discardPile).toMatchObject({move : "take", chip : "Take"});
        expect(turn.steps?.map(step => step.state)).toEqual(["current", "todo", "todo"]);
        expect(turn.prompt).toBe("You start this round. Draw from the deck or take the " + shortName(view.discard[0]) + ".");
        expect(turn.brief).toBe("You start: draw, or take the " + shortName(view.discard[0]));
        expect(turn.goDown).toMatchObject({enabled : false, hint : "Draw a card first"});
    });

    it("won't discard until a claim window closes", () => {
        let state = play(newGame(), 0, {type : "draw", from : "deck"});
        let view = viewFor(state, 0, 0);
        let turn = yourTurn(view, view.hand, 0);
        expect(turn.playing).toBe(true);
        expect(turn.selected?.card).toEqual(view.hand[0]);
        expect(turn.discardPile).toBeNull();
        expect(turn.prompt).toBe("Waiting to see if anyone claims the " + shortName(view.claim!.card) + ".");

        state = expireClaims(state, state.claim!.deadline);
        view = viewFor(state, 0, 0);
        turn = yourTurn(view, view.hand, 0);
        expect(turn.discardPile).toMatchObject({move : "discard", chip : "Discard " + shortName(view.hand[0])});
        expect(turn.steps?.map(step => step.state)).toEqual(["done", "todo", "current"]);
    });

    it('finds where the selected card can go, and which cards fit somewhere', () => {
        const hand = cards("5S 8S 9D 2C");
        const view = viewFor(building(hand), 0, 0);

        const swap = yourTurn(view, hand, 0);
        expect(swap.targets[0]).toEqual([null]);
        expect(swap.targets[1][0]).toMatchObject({label : "Swap for A♥", owner : "Opponent 1's run"});
        expect(swap.prompt).toBe("5♠ can replace the wild A♥ in Opponent 1's run, and the ace comes back to you.");
        expect(swap.playable).toEqual([true, true, false, false]);

        const add = yourTurn(view, hand, 1);
        expect(add.targets[1][0]).toMatchObject({label : "Add 8♠", returnedAce : null});
        expect(add.prompt).toBe("Add 8♠ to a highlighted meld, or discard it to end your turn.");
        expect(add.brief).toBe("Add 8♠ to a gold meld, or discard it");
        expect(swap.brief).toBe("Swap 5♠ for the wild A♥, or discard it");

        expect(yourTurn(view, hand, 3).prompt).toBe("2♣ doesn't fit any meld. Discard it to end your turn.");
        expect(yourTurn(view, hand, 3).brief).toBe("2♣ fits no meld: discard it");
        expect(yourTurn(view, hand, null).prompt).toBe("Select a card to add to a meld or discard. Gold dots mark cards that fit.");
    });

    it("doesn't say whether your hand meets the requirement", () => {
        const state = play(newGame(), 0, {type : "draw", from : "discard"});
        const ready = cards("7C 7D 7S 9C 9H 9S 2D");
        const notReady = cards("7C 7D 3S 9C 9H 4S 2D");
        for (let hand of [ready, notReady]) {
            state.seats[0].hand = hand;
            const view = viewFor(state, 0, 0);
            const turn = yourTurn(view, view.hand, null);
            expect(turn.goDown).toEqual({enabled : true, hint : "Need " + requirementText(view.requirement)});
            expect(turn.prompt).toBe("Select a card to discard. To go down you need " + requirementText(view.requirement) + ".");
        }
    });

    it("lets you claim on someone else's turn, and nothing else", () => {
        // you and Opponent 1 each take the discard and throw a card, then
        // Opponent 2 draws from the deck, offering Opponent 1's discard
        let state = newGame();
        for (let seat of [0, 1]) {
            state = play(state, seat, {type : "draw", from : "discard"});
            state = play(state, seat, {type : "discard", card : state.seats[seat].hand[0].id});
        }
        state = play(state, 2, {type : "draw", from : "deck"});
        const view = viewFor(state, 0, 0);
        const turn = yourTurn(view, view.hand, 0);
        expect(turn).toMatchObject({drawing : false, playing : false, selected : null, discardPile : null, steps : null});
        expect(turn.prompt).toBe("Opponent 2 drew from the deck. Claim the " + shortName(view.claim!.card) + ", or pass?");
        expect(turn.brief).toBe("Claim the " + shortName(view.claim!.card) + ", or pass?");
        expect(turn.goDown.hint).toBe("You can go down on your turn");
    });
});
