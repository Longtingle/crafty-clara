import update from 'immutability-helper';
import actions from './actions.js';

import generateDeck from '../deck-functions/deck-functions.js';

var cards = generateDeck(2);

const initialState = {
    debug : true,
    game : {
        gameState : 0,
        round : 0,
        requirement : 0,
    },
    player : {
        hand : {

        }
    },
    table : {
        deck : cards,
        discard : {}
    }
}

const reducer = (state = initialState, action) => {
    var newState;
    if (state.debug === true) console.log ("REDUCER TRIGGERED: " + action);
    if (action.type === actions.START_NEW_GAME) {
        newState = update(state, {game : {gameState : {$set : 1}}});
        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: " + newState);
        return newState;
    }
    return state;
}

export default reducer;