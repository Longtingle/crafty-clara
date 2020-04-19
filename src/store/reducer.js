import update from 'immutability-helper';
import actions from './actions.js';
import GAME_STATES from './constants.js';
import {AI_STAGES} from './constants.js';

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
        cardSelected : null,
        table : {

        },
        isDown : false,
        canGoDown : false,
        isGoingDown : false
    },
    AI : {
        players : null,
        AIPhase : false,
        AIPlaying : null,
        AIStage : null
    },
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
                requirement : {$set : {R : 0, S : 2}}
            },
            player : {
                hand : { $set : Array.from(action.payload.hands[0])}
            },
            AI : { players : {$set : action.payload.AI}}, 
            deck : {$set : action.payload.deck},
            discard : {$set : action.payload.discard}
        })
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

    if (action.type === actions.SELECT_CARD_FROM_HAND) {
        newState = update(state, {
            player : {cardSelected : {$set : action.payload.cardSelected}}
        });
        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.FROM_HAND_TO_DISCARD) {
        var newHand = [...state.player.hand];
        var discarded = newHand.splice(state.player.cardSelected, 1);
        var newDiscard = [...state.discard];
        newDiscard.unshift(discarded[0]);
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.AI_DRAW}},
            player : {
                hand : {$set : newHand},
                cardSelected : {$set : null},
            },
            discard : {$set : newDiscard},
            AI : {
                AIPhase : {$set : true},
                AIPlaying : {$set : 0},
                AIStage : {$set : AI_STAGES.AI_DRAW}
            }
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.AI_PICKED_FROM_DECK) {
        var newDeck = [...state.deck];
        newDeck.shift();
        newState = update (state, {
            deck : {$set : newDeck},
            AI : {AIStage : {$set : AI_STAGES.AI_WAIT}}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }



    if (action.type === actions.TEMPLATE) {
        
        newState = update (state, {
            
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    return state;
}

export default reducer;