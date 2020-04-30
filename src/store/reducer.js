import update from 'immutability-helper';
import actions from './actions.js';
import GAME_STATES from './constants.js';
import {AI_STAGES} from './constants.js';
import params from '../game-functions/params.js';
import initialState from './initial-state.js';

const reducer = (state = initialState, action) => {
    var newState;
    if (state.debug === true) console.log ("REDUCER TRIGGERED: " + action.type);

    if (action.type === actions.START_NEW_GAME) {
        let playersArray = [];
        for (let i = 0; i < state.AI.AICount ; i++){
            playersArray.push({
                hand : action.payload.hands[i+1],
                isDown : false,
                table : []
            });
        }


        newState = update(state, {
            game : {
                gameState : {$set : GAME_STATES.PW_DRAW_CARD},
                round : {$set : 1},
                requirement : {$set : {R : 0, S : 2}}
            },
            player : {
                hand : { $set : Array.from(action.payload.hands[0])}
            },
            AI : { players : {$set : playersArray}}, 
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
            game : {
                gameState : {$set : GAME_STATES.AI_DRAW}
            },
            player : {
                hand : {$set : newHand},
                cardSelected : {$set : null},
            },
            discard : {$set : newDiscard},
            AI : {AIInPlay : {$set : 0}}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.AI_PICKED_FROM_DECK) {
        var newDeck = [...state.deck];
        var newHand = [...state.AI.players[state.AI.AIInPlay].hand]
        newHand.push(...newDeck.splice(0, 1));

        var newAIPlayers = state.AI.players.map((player, index) => {
            if (index !== state.AI.AIInPlay ){
                return player;
            } 
            return update(player, {
                hand : {$set : newHand}
            });
        });
        
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.AI_WAIT}},
            deck : {$set : newDeck},
            AI : {players : {$set : newAIPlayers}}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.AI_WAIT_COMPLETE) {
        
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.AI_PLAY}}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.FROM_AI_TO_DISCARD) {
        // if this is the last AI in the loop, then move back to player, if not, next AI
        let newAIHand = [...state.AI.players[state.AI.AIInPlay].hand]
        newAIHand.splice(action.payload.cardIndex, 1);
        let newGameState;
        let newAIInPlay;
        if (state.AI.AIInPlay === state.AI.AICount - 1 ){
            newAIInPlay = null;
            newGameState = GAME_STATES.PW_DRAW_CARD;
        }else { 
            newAIInPlay = state.AI.AIInPlay + 1;
            newGameState = GAME_STATES.AI_DRAW;
        }
        var newAIPlayers = state.AI.players.map((player, index) => {
            if (index !== state.AI.AIInPlay ){
                return player;
            } 
            return update(player, {
                hand : {$set : newAIHand}
            });
        });

        newState = update (state, {
            game : {gameState : {$set : newGameState}},
            AI : {
                AIInPlay : {$set : newAIInPlay},
                players : {$set : newAIPlayers}
            }

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