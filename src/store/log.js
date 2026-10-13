import actions from './actions.js';
import {SET} from './constants.js';
import {shortName} from '../engine/card-names.ts';

const MAX_ENTRIES = 30;

// The card in `before` that is missing from `after` (hands are matched by name
// because the reducer clones cards).
const removedCard = (before, after) => {
    let remaining = after.map(card => card.displayString);
    return before.find(card => {
        let index = remaining.indexOf(card.displayString);
        if (index === -1) return true;
        remaining.splice(index, 1);
        return false;
    });
}

const kind = (setrun) => (setrun.type === SET) ? "set" : "run";

// Whose setrun a card went onto, from the human's point of view.
const setrunOwner = (state, playerType, AIIndex, actor) => {
    if (playerType === "player") return "your";
    if (AIIndex === actor) return "their";
    return state.AI.players[AIIndex].name + "'s";
}

// Describes an action for the activity log as {actor, text}, where actor is
// "player" or an AI index and text follows the actor's name ("drew from the
// deck"). Returns null for actions that aren't worth logging.
const describeAction = (action, state) => {
    let AIInPlay = state.AI.AIInPlay;
    let payload = action.payload;

    switch (action.type) {
        case actions.FROM_DECK_TO_PLAYER:
            return {actor : "player", text : "drew " + shortName(state.deck[0]) + " from the deck"};
        case actions.FROM_DISCARD_TO_PLAYER:
            return {actor : "player", text : "took " + shortName(state.discard[0]) + " from the discard pile"};
        case actions.FROM_HAND_TO_DISCARD:
            return {actor : "player", text : "discarded " + shortName(state.player.hand[state.player.cardSelected])};
        case actions.AI_PICKED_FROM_DECK:
            return {actor : AIInPlay, text : "drew from the deck"};
        case actions.AI_PICKED_FROM_DISCARD:
            return {actor : AIInPlay, text : "took " + shortName(state.discard[0]) + " from the discard pile"};
        case actions.DRAW_OOT_RESOLVE: {
            let winner = payload.winner;
            if (winner.winnerType === "none") return null;
            let actor = (winner.winnerType === "player") ? "player" : winner.index;
            return {actor, text : "claimed " + shortName(state.discard[0]) + " out of turn"};
        }
        case actions.FROM_AI_TO_DISCARD:
            return {actor : AIInPlay, text : "discarded " + shortName(state.AI.players[AIInPlay].hand[payload.cardIndex])};
        case actions.GO_DOWN_SUBMIT_HAND:
            return {actor : "player", text : "went down"};
        case actions.AI_GO_DOWN_SUBMIT:
            return {actor : AIInPlay, text : "went down"};
        case actions.AI_ADD_CARD_TO_TABLE: {
            let card = removedCard(state.AI.players[AIInPlay].hand, payload.newHand);
            let owner = setrunOwner(state, payload.playerType, payload.AIIndex, AIInPlay);
            return {actor : AIInPlay, text : "added " + shortName(card) + " to " + owner + " " + kind(payload.newSetrun)};
        }
        case actions.PLAYER_ADD_CARD_TO_TABLE: {
            let card = state.player.hand[state.player.cardSelected];
            let owner = setrunOwner(state, payload.playerType, payload.AIIndex, "player");
            let text = "added " + shortName(card) + " to " + owner + " " + kind(payload.newSetrun);
            if (payload.returnedAce) text += " and took back the wild " + shortName(payload.returnedAce);
            return {actor : "player", text};
        }
        case actions.END_ROUND: {
            if (state.player.hand.length === 0) return {actor : "player", text : "went out"};
            let out = state.AI.players.findIndex(player => player.hand.length === 0);
            return (out === -1) ? null : {actor : out, text : "went out"};
        }
        default:
            return null;
    }
}

// Wraps the reducer so every logged action adds an entry to state.log.
// The log starts again with each round.
const withLog = (reducer) => (state, action) => {
    let next = reducer(state, action);
    if (state === undefined || next === state) return next;
    if (action.type === actions.START_NEW_GAME || action.type === actions.START_NEXT_ROUND) {
        return {...next, log : []};
    }
    let entry = describeAction(action, state);
    if (entry === null) return next;
    let id = (state.log.length > 0) ? state.log[0].id + 1 : 1;
    return {...next, log : [{id, ...entry}, ...next.log].slice(0, MAX_ENTRIES)};
}

export {describeAction, withLog};
