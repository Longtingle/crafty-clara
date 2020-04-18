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
        hand : [],
        table : {

        },
        selectedCard : null,
        isDown : false,
        canGoDown : false,
        isGoingDown : false
    },
    AI : null,
    deck : [],
    discard : []
}

const reducer = (state = initialState, action) => {
    var newState;
    if (state.debug === true) console.log ("REDUCER TRIGGERED: " + action.type);
    if (action.type === actions.START_NEW_GAME) {
        let newAI= [];

        newState = update(state, {
            game : {
                gameState : {$set : GAME_STATES.PW_DRAW_CARD},
                round : {$set : 1},
                requirement : {$set : {R : 0, S : 2}}},
            player : {
                hand : { $set : Array.from(action.payload.hands[0])}
            },
            AI : {$set : action.payload.AI}, 
            deck : {$set : action.payload.deck},
            discard : {$set : action.payload.discard}
        });
        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }
    if (action.type === actions.FROM_DECK_TO_PLAYER){
        let newDeck = Array.from(state.deck);
        let newPlayerHand = Array.from(state.player.hand);
        newPlayerHand.push(state.deck[0])
        newDeck.shift();
        newState = update(state, {
            game : {gameState : {$set : GAME_STATES.PW_PLAY}},
            player : { hand : {$set : newPlayerHand}},
            deck : {$set : newDeck},
        });
        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }
    return state;
}

export default reducer;