import update from 'immutability-helper';
import actions from './actions.js';
import GAME_STATES from './constants.js';

import generateDeck from '../game-functions/deck-functions.js';


const initialState = {
    debug : true,
    game : {
        gameState : GAME_STATES.NO_GAME,
        round : 0,
        requirement : 0,
    },
    player : {
        hand : {

        }
    },
    AI : [],
    table : {
        deck : [],
        discard : {}
    }
}

const reducer = (state = initialState, action) => {
    var newState;
    if (state.debug === true) console.log ("REDUCER TRIGGERED: " + action);
    if (action.type === actions.START_NEW_GAME) {
        newState = update(state, 
            {
                game : {
                    gameState : {$set : GAME_STATES.PW_DRAW_CARD},
                    round : {$set : 1},
                    requirement : {$set : {R : 0, S : 2}}},
                table : {
                    deck : {$set : action.payload.cards}
                }
            }
        );
        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }
    return state;
}

export default reducer;