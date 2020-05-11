import update from 'immutability-helper';
import actions from './actions.js';
import GAME_STATES from './constants.js';
import {AI_STAGES, ROUND_REQUIREMENTS} from './constants.js';
import params from '../game-functions/params.js';
import initialState from './initial-state.js';
import _ from 'lodash';
import { shallowEqual } from 'react-redux';

const testHand = [
    "2C", "2H", "2D", "2S", "8H", "8S", "8D"
]

const reducer = (state = initialState, action) => {
    let newState;  
    let d = new Date;
    if (state.debug === true) console.log ("REDUCER TRIGGERED - " + action.type + " - " + d.toLocaleTimeString());

    if (action.type === actions.START_NEW_GAME) {
        let playersArray = [];
        for (let i = 0; i < state.AI.AICount ; i++){
            playersArray.push({
                name : "Opponent",
                hand : action.payload.hands[i+1],
                isDown : false,
                table : [],
                points : {
                    points : [],
                    total : 0
                }
            });
        }


        newState = update(state, {
            game : {
                gameState : {$set : GAME_STATES.PW_DRAW_CARD},
                round : {$set : 0},
                requirement : {$set : {R : 0, S : 2}}
            },
            player : {
                //hand : { $set : Array.from(action.payload.hands[0])}
                hand : { $set : testHand}
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

    if (action.type === actions.FROM_DISCARD_TO_PLAYER) {
        let newHand = [...state.player.hand];
        let newDiscard = [...state.discard];
        newHand.push(newDiscard.shift());
        newState = update(state, {
            game : {gameState : {$set : GAME_STATES.PW_PLAY}},
            player : {hand : {$set : newHand}},
            discard : {$set : newDiscard}
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
            game : {gameState : {$set : GAME_STATES.AI_WAIT_ONE}},
            deck : {$set : newDeck},
            AI : {players : {$set : newAIPlayers}}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.AI_PICKED_FROM_DISCARD) {
        var newDiscard = [...state.discard];
        var newHand = [...state.AI.players[state.AI.AIInPlay].hand]
        newHand.push(...newDiscard.splice(0, 1));

        var newAIPlayers = state.AI.players.map((player, index) => {
            if (index !== state.AI.AIInPlay ){
                return player;
            } 
            return update(player, {
                hand : {$set : newHand}
            });
        });
        
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.AI_WAIT_ONE}},
            discard : {$set : newDiscard},
            AI : {players : {$set : newAIPlayers}}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }


    if (action.type === actions.AI_WAIT_ONE_COMPLETE) {
        
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.AI_DRAW_OOT}}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.AI_DRAW_OOT) {
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.AI_WAIT_TWO}},
            OOTRequests : {$set : action.payload.OOTRequests}
        });
      
        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.AI_WAIT_TWO_COMPLETE) {
        
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.AI_OOT_RESOLVE}}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.DRAW_OOT_RESOLVE) {
        if (action.payload.winner.winnerType === "none") {
            newState = update (state, {
                game : {gameState : {$set : GAME_STATES.AI_PLAY}},
                OOTRequests : {$set : []}
            });
            return newState;
        }

        let newDiscard = [...state.discard];

        if (action.payload.winner.winnerType === "player") {
            newHand = [...state.player.hand];
        } else {
            newHand = [...state.AI.players[action.payload.winner.index].hand];
        }
        
        newHand.push(state.discard[0]);
        newDiscard.shift();
        if (action.payload.winner.winnerType === "player") {
            console.log("OOT to player");
            newState = update (state, {
                game : {gameState : {$set : GAME_STATES.AI_PLAY}},
                discard : {$set : newDiscard},
                player : {hand : {$set : newHand}},
                OOTRequests : {$set : []}
            });

        } else {
            console.log("card to AI");
            let newAIPlayers = state.AI.players.map((player, index) => {
                if (index !== action.payload.winner.index ){
                    return player;
                } 
                return update(player, {
                    hand : {$set : newHand}
                });
            });
            newState = update (state, {
                game : {gameState : {$set : GAME_STATES.AI_PLAY}},
                discard : {$set : newDiscard},
                AI : {players : {$set : newAIPlayers}},
                OOTRequests : {$set : []}
            });
        }
        
        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.FROM_AI_TO_DISCARD) {
        // if this is the last AI in the loop, then move back to player, if not, next AI
        let newAIHand = [...state.AI.players[state.AI.AIInPlay].hand]
        let discardedCard = newAIHand.splice(action.payload.cardIndex, 1);
        let newGameState;
        let newAIInPlay;
        let newDiscard = [...state.discard];
        newDiscard.unshift(discardedCard[0]);
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
            },
            discard : {$set : newDiscard}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.SORT_PLAYER_HAND) {
        
        newState = update (state, {
            player : {hand : {$set : action.payload.newHand}}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.SHOW_GOING_DOWN_MODAL) {
        
        newState = update (state, {
            UI : {showModalBack : {$set : true}},
            player : {isGoingDown : {$set : true}}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.CANCEL_PLAYER_GO_DOWN) {
        
        newState = update (state, {
            UI : {
                showModalBack : {$set : false},
                goingDown : {
                    selectedCards : {$set : []},
                    submittedSetruns : {$set : []}
                }
            },
            player : {isGoingDown : {$set : false}}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.GO_DOWN_SELECT_CARD) {
        let selectedCards = [...state.UI.goingDown.selectedCards];
        if (selectedCards.includes(action.payload.cardNum)) {
            let index = selectedCards.indexOf(action.payload.cardNum);
            if (index !== -1) selectedCards.splice(index, 1);
        }else {
            selectedCards.push(action.payload.cardNum);
        }
        newState = update (state, {
            UI : {goingDown : {selectedCards : {$set : selectedCards}}}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.GO_DOWN_SUBMIT_SETRUN) {
        let selectedCards = [...state.UI.goingDown.selectedCards];
        let submittedSetruns = [...state.UI.goingDown.submittedSetruns];
        
        submittedSetruns.push(action.payload.setrun);

        newState = update (state, {
            UI : { 
                goingDown : { 
                    selectedCards : {$set : []},
                    submittedSetruns : {$set : submittedSetruns}
                }
            }
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.GO_DOWN_SUBMIT_HAND) {
        console.log(action.payload.table);
        console.log(action.payload.hand);
        let player = _.cloneDeep(state.player);
        player.isGoingDown = false;
        player.hand = action.payload.hand;
        player.isDown = true;
        player.table = action.payload.table;
        let UI = _.cloneDeep(state.UI);
        UI.goingDown.selectedCards = [];
        UI.goingDown.submittedSetruns = [];
        UI.showModalBack = false;

        newState = update (state, {
            UI : {$set : UI},
            player : {$set : player}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.AI_GO_DOWN_SUBMIT) {
        console.log("AI GOING DOWN");
        console.log("AI GOING DOWN");
        console.log("AI GOING DOWN");
        console.log("AI GOING DOWN");
        console.log("AI GOING DOWN");
        console.log("AI GOING DOWN");
        console.log("AI GOING DOWN");
        console.log("AI GOING DOWN");
        let newHand = action.payload.hand;
        //let discardCard = newHand.splice(0, 1);
        //let newDiscard = [...state.discard];
        //newDiscard.unshift(discardCard[0]);

        let AI = _.cloneDeep(state.AI);

        AI.players[state.AI.AIInPlay].hand = newHand;
        AI.players[state.AI.AIInPlay].isDown = true;
        AI.players[state.AI.AIInPlay].table = action.payload.table;
  
        newState = update (state, {
            AI : {$set : AI}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.AI_ADD_CARD_TO_TABLE) {
        //this.props.AIAddCardToTable(newSetrun, newHand, playerType, setrunIndex, AIIndex)
        let table;

        let AI = _.cloneDeep(state.AI);
        AI.players[state.AI.AIInPlay].hand = action.payload.newHand;
        if (action.payload.playerType === "player") { 
            table = _.cloneDeep(state.player.table);
            table[action.payload.setrunIndex].cards = action.payload.newSetrun;
            newState = update (state, {
                player : {
                    cardSelected : {$set : null},
                    table : {$set : table}
                },
                AI : {$set : AI}
            });
        } else {
            AI.players[action.payload.AIIndex].table[action.payload.setrunIndex].cards = action.payload.newSetrun;

            newState = update (state, {
                AI : {$set : AI}
            });
        }

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.PLAYER_ADD_CARD_TO_TABLE) {
        let hand = _.clone(state.player.hand);
        hand.splice(state.player.cardSelected, 1);
        let table;
        if (action.payload.playerType === "player") { 
            table = _.cloneDeep(state.player.table);
            table[action.payload.setrunIndex].cards = action.payload.newSetrun;
            newState = update (state, {
                player : {
                    hand : {$set : hand},
                    cardSelected : {$set : null},
                    table : {$set : table}
                }
            });
        } else {
            let AI = _.cloneDeep(state.AI);
            AI.players[action.payload.AIIndex].table[action.payload.setrunIndex].cards = action.payload.newSetrun;

            newState = update (state, {
                player : {
                    hand : {$set : hand},
                    cardSelected : {$set : null}
                }, 
                AI : {$set : AI}
            });
        }
        

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    if (action.type === actions.END_ROUND) {
        let player = _.cloneDeep(state.player);
        player.points.points.push(action.payload.points.player);
        player.points.total = player.points.total + action.payload.points.player;
        let AI = _.cloneDeep(state.AI);
        AI.players.forEach((AI, index) => {
            AI.points.points.push(action.payload.points.AI[index]);
            AI.points.total = AI.points.total + action.payload.points.AI[index];
        });
        let UI = _.cloneDeep(state.UI);
        UI.showModalBack = true;
        UI.endOfRound = true;
        
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.ROUND_END}},
            player : {$set : player},
            AI : {$set : AI},
            UI : {$set : UI}
        });

        if (state.debug === true) console.log("ABOUT TO RETURN NEW STATE: ");
        if (state.debug === true) console.log(newState);
        return newState;
    }

    return state;

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