import reducer from './reducer.js';
import actions from './actions.js';
import GAME_STATES from './constants.js';
import {createCard} from '../game-functions/deck-functions.js';

const card = (str) => createCard(parseInt(str.slice(0, -1)), str.slice(-1));
const cards = (str) => str.split(" ").map(card);

const startGame = () => reducer(undefined, {
    type : actions.START_NEW_GAME,
    payload : {
        deck : cards("10H 2S 3S"),
        discard : cards("9C"),
        hands : [cards("7D 8D"), cards("4C 5C"), cards("4D 5D"), cards("4H 5H")]
    }
});

describe('activity log', () => {
    it('starts empty and logs the human drawing and discarding', () => {
        let state = startGame();
        expect(state.log).toEqual([]);

        state = reducer(state, {type : actions.FROM_DECK_TO_PLAYER});
        expect(state.log[0]).toMatchObject({actor : "player", text : "drew 10♥ from the deck"});
        expect(state.player.newCard).toEqual({displayString : "10H", label : "New"});

        state = reducer(state, {type : actions.SELECT_CARD_FROM_HAND, payload : {cardSelected : 0}});
        state = reducer(state, {type : actions.FROM_HAND_TO_DISCARD});
        expect(state.log.map(entry => entry.text)).toEqual(["discarded 7♦", "drew 10♥ from the deck"]);
        expect(state.game.gameState).toBe(GAME_STATES.AI_DRAW);
    });

    it('logs AI moves and claims', () => {
        let state = startGame();
        state = reducer(state, {type : actions.FROM_DECK_TO_PLAYER});
        state = reducer(state, {type : actions.SELECT_CARD_FROM_HAND, payload : {cardSelected : 0}});
        state = reducer(state, {type : actions.FROM_HAND_TO_DISCARD});
        state = reducer(state, {type : actions.AI_PICKED_FROM_DECK});
        expect(state.log[0]).toMatchObject({actor : 0, text : "drew from the deck"});

        state = reducer(state, {type : actions.PLAYER_DRAW_OOT});
        expect(state.playerClaim).toBe(true);
        expect(state.game.gameUpdate).toBe(false);

        state = reducer(state, {type : actions.DRAW_OOT_RESOLVE, payload : {winner : {winnerType : "player"}}});
        expect(state.log[0]).toMatchObject({actor : "player", text : "claimed 7♦ out of turn"});
        expect(state.player.newCard).toEqual({displayString : "7D", label : "Claimed"});
        expect(state.playerClaim).toBe(false);
    });

    it('ignores UI-only actions', () => {
        let state = startGame();
        let next = reducer(state, {type : actions.SHOW_GOING_DOWN_MODAL});
        expect(next.log).toBe(state.log);
    });
});
