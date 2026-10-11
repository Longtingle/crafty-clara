import update from 'immutability-helper';
import actions from './actions.js';
import GAME_STATES from './constants.js';
import {ROUND_REQUIREMENTS} from './constants.js';
import initialState from './initial-state.js';
import {withLog} from './log.js';
import _ from 'lodash';

const reducer = (state = initialState, action) => {
    let newState;  
  

    if (action.type === actions.START_NEW_GAME) {

        let playersArray = [];
        for (let i = 0; i < state.AI.AICount ; i++){
            playersArray.push({
                name : "Opponent " + (i + 1),
                hand : action.payload.hands[i+1],
                isDown : false,
                table : [],
                points : {
                    points : [],
                    total : 0
                },
                message : {
                    text : "",
                    timestamp : null
                }
            });
        };

        // start from the initial state so nothing carries over from a previous game
        newState = update(initialState, {
            timestamp : {$set : Date.now()},
            game : {
                gameUpdate : {$set : false},
                gameState : {$set : GAME_STATES.PW_DRAW_CARD},
                round : {$set : 0},
                requirement : {$set : ROUND_REQUIREMENTS[0]}
            },
            player : {
                hand : { $set : Array.from(action.payload.hands[0])}
            },
            AI : { players : {$set : playersArray}, messageUpdate : {$set : null}}, 
            deck : {$set : action.payload.deck},
            discard : {$set : action.payload.discard},
            discardCovered : {$set : false}
        })
 
        return newState;
    }

    if (action.type === actions.START_NEXT_ROUND) {
        let AI = _.cloneDeep(state.AI);
        AI.players.forEach((player, index) => {
            player.hand = action.payload.hands[index + 1];
            player.table = [];
            player.isDown = false;
        });
        AI.AIInPlay = null;
        let rand = Math.floor(Math.random() * AI.AICount);
        AI.players[rand].message  = {
            text : "Oh I've got a hand like a foot!",
            timestamp : Date.now()
        };
        AI.messageUpdate = [rand];
        let game = _.cloneDeep(state.game);
        game.gameState = GAME_STATES.PW_DRAW_CARD;
        game.round = state.game.round + 1;
        game.requirement = ROUND_REQUIREMENTS[game.round];
        game.gameUpdate = false;

        newState = update(state, {
            game : {$set : game},
            UI : {
                endOfRound : {$set : false}
            },
            player : {
                hand : { $set : Array.from(action.payload.hands[0])},
                cardSelected : {$set : null},
                newCard : {$set : null},
                table : {$set : []},
                isDown : {$set : false}
            },
            AI : {$set : AI},
            deck : {$set : action.payload.deck},
            discard : {$set : action.payload.discard},
            discardCovered : {$set : false},
            OOTRequests : {$set : []},
            claimChoice : {$set : null}
        })

        return newState;
    }

    if (action.type === actions.FROM_DECK_TO_PLAYER){
        let newDeck = _.cloneDeep(state.deck);
        let newPlayerHand = _.cloneDeep(state.player.hand);
        newPlayerHand.push(state.deck[0])
        newDeck.shift();
        newState = update(state, {
            game : {gameState : {$set : GAME_STATES.PW_PLAY}, gameUpdate : {$set : false}},
            player : {
                hand : {$set : newPlayerHand},
                newCard : {$set : {id : state.deck[0].id, label : "New"}}
            },
            deck : {$set : newDeck},
            AI : { messageUpdate : {$set : null}}
        });

        return newState;
    }

    if (action.type === actions.FROM_DISCARD_TO_PLAYER) {
        let newHand = _.cloneDeep(state.player.hand);
        let newDiscard = _.cloneDeep(state.discard);
        newHand.push(newDiscard.shift());
        newState = update(state, {
            game : {gameState : {$set : GAME_STATES.PW_PLAY}, gameUpdate : {$set : false}},
            player : {
                hand : {$set : newHand},
                newCard : {$set : {id : state.discard[0].id, label : "New"}}
            },
            discard : {$set : newDiscard},
            discardCovered : {$set : true},
            AI : { messageUpdate : {$set : null}}
        });

        return newState;
    }

    if (action.type === actions.SELECT_CARD_FROM_HAND) {
        newState = update(state, {
            game : {gameUpdate : {$set : false}},
            player : {cardSelected : {$set : action.payload.cardSelected}},
            AI : { messageUpdate : {$set : null}}
        });

        return newState;
    }

    if (action.type === actions.FROM_HAND_TO_DISCARD) {
        var newHand = _.cloneDeep(state.player.hand);
        var discarded = newHand.splice(state.player.cardSelected, 1);
        var newDiscard = _.cloneDeep(state.discard);
        newDiscard.unshift(discarded[0]);

        let AI = _.cloneDeep(state.AI);
        AI.players[0].message = {text : "...thinking...", timestamp : Date.now()}
        AI.messageUpdate = [0];
        AI.AIInPlay = 0;
        newState = update (state, {
            game : {
                gameState : {$set : GAME_STATES.AI_DRAW},
                gameUpdate : {$set : true}
            },
            player : {
                hand : {$set : newHand},
                cardSelected : {$set : null},
                newCard : {$set : null}
            },
            discard : {$set : newDiscard},
            discardCovered : {$set : false},
            claimChoice : {$set : null},
            AI : {$set : AI}
        });


        return newState;
    }

    if (action.type === actions.AI_PICKED_FROM_DECK) {
        var newDeck = _.cloneDeep(state.deck);
        var newHand = _.cloneDeep(state.AI.players[state.AI.AIInPlay].hand);
        newHand.push(newDeck.splice(0, 1)[0]);

        var newAIPlayers = state.AI.players.map((player, index) => {
            if (index !== state.AI.AIInPlay ){
                return player;
            } 
            return update(player, {
                hand : {$set : newHand},
                message : {
                    text : {$set : "Picked from deck"},
                    timestamp : {$set : Date.now()}
                }
            });
        });
        
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.AI_WAIT_ONE}, gameUpdate : {$set : true}},
            deck : {$set : newDeck},
            AI : {
                players : {$set : newAIPlayers},
                messageUpdate : {$set : [state.AI.AIInPlay]}
            }
        });
        return newState;
    }

    if (action.type === actions.AI_PICKED_FROM_DISCARD) {
        var newDiscard = _.cloneDeep(state.discard);
        var newHand = _.cloneDeep(state.AI.players[state.AI.AIInPlay].hand);
        newHand.push(newDiscard.splice(0, 1)[0]);

        var newAIPlayers = state.AI.players.map((player, index) => {
            if (index !== state.AI.AIInPlay ){
                return player;
            } 
            return update(player, {
                hand : {$set : newHand},
                message : {
                    text : {$set : "Picked from discard"},
                    timestamp : {$set : Date.now()}
                }
            });
        });
        
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.AI_WAIT_ONE}, gameUpdate : {$set : true}},
            discard : {$set : newDiscard},
            discardCovered : {$set : true},
            AI : {players : {$set : newAIPlayers}, messageUpdate : {$set : [state.AI.AIInPlay]}}
        });


        return newState;
    }

    if (action.type === actions.AI_WAIT_ONE_COMPLETE) {
        
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.AI_DRAW_OOT}, gameUpdate : {$set : true}},
            AI : {messageUpdate : {$set : null}}
        });


        return newState;
    }

    if (action.type === actions.AI_DRAW_OOT) {
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.AI_WAIT_TWO}, gameUpdate : {$set : true}},
            OOTRequests : {$set : action.payload.OOTRequests},
            AI : {messageUpdate : {$set : null}}
        });
      

        return newState;
    }

    if (action.type === actions.AI_WAIT_TWO_COMPLETE) {
        
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.AI_OOT_RESOLVE}, gameUpdate : {$set : true}},
            AI : {messageUpdate : {$set : null}}
        });


        return newState;
    }

    // UI only: the human's claim or pass is settled with the AI claims in
    // AI_OOT_RESOLVE (App ends the claim wait as soon as either arrives)
    if (action.type === actions.PLAYER_DRAW_OOT || action.type === actions.PLAYER_PASS_OOT) {
        newState = update (state, {
            game : {gameUpdate : {$set : false}},
            claimChoice : {$set : action.type === actions.PLAYER_DRAW_OOT ? "claim" : "pass"},
            AI : {messageUpdate : {$set : null}}
        });

        return newState;
    }

    if (action.type === actions.DRAW_OOT_RESOLVE) {
        if (action.payload.winner.winnerType === "none") {
            newState = update (state, {
                game : {gameState : {$set : GAME_STATES.AI_PLAY}, gameUpdate : {$set : true}},
                OOTRequests : {$set : []},
                claimChoice : {$set : null},
                AI : {messageUpdate : {$set : null}}
            });
            return newState;
        }

        let newDiscard = _.cloneDeep(state.discard);
        let newHand;

        if (action.payload.winner.winnerType === "player") {
            newHand = _.cloneDeep(state.player.hand);
        } else {
            newHand = _.cloneDeep(state.AI.players[action.payload.winner.index].hand);
        }
        
        newHand.push(state.discard[0]);
        newDiscard.shift();
        if (action.payload.winner.winnerType === "player") {
            newState = update (state, {
                game : {gameState : {$set : GAME_STATES.AI_PLAY}, gameUpdate : {$set : true}},
                discard : {$set : newDiscard},
                discardCovered : {$set : true},
                player : {
                    hand : {$set : newHand},
                    newCard : {$set : {id : state.discard[0].id, label : "Claimed"}}
                },
                OOTRequests : {$set : []},
                claimChoice : {$set : null},
                AI : {messageUpdate : {$set : null}}
            });

        } else {
            let newAIPlayers = state.AI.players.map((player, index) => {
                if (index !== action.payload.winner.index ){
                    return player;
                } 
                return update(player, {
                    hand : {$set : newHand},
                    message : {
                        text : {$set : "I'll take that!"},
                        timestamp : {$set : Date.now()}
                    }
                });
            });
            newState = update (state, {
                game : {gameState : {$set : GAME_STATES.AI_PLAY}, gameUpdate : {$set : true}},
                discard : {$set : newDiscard},
                discardCovered : {$set : true},
                AI : {players : {$set : newAIPlayers}, messageUpdate : {$set : [action.payload.winner.index]}},
                OOTRequests : {$set : []},
                claimChoice : {$set : null}
            });
        }
        

        return newState;
    }

    if (action.type === actions.FROM_AI_TO_DISCARD) {
        // if this is the last AI in the loop, then move back to player, if not, next AI
        let newAIHand = _.cloneDeep(state.AI.players[state.AI.AIInPlay].hand);
        let discardedCard = newAIHand.splice(action.payload.cardIndex, 1);
        let newDiscard = _.cloneDeep(state.discard);
        let newGameUpdate, message, messageUpdate, newAIInPlay, newGameState
        newDiscard.unshift(discardedCard[0]);
        if (state.AI.AIInPlay === state.AI.AICount - 1 ){
            newAIInPlay = null;
            newGameState = GAME_STATES.PW_DRAW_CARD;
            newGameUpdate = false;
            messageUpdate = [];
            message = {text : null, timestamp : Date.now()}
        }else { 
            newAIInPlay = state.AI.AIInPlay + 1;
            newGameState = GAME_STATES.AI_DRAW;
            newGameUpdate = true;
            messageUpdate = [newAIInPlay];
            message = {text : "...thinking...", timestamp : Date.now()}
        }
        messageUpdate.push(state.AI.AIInPlay);
        var newAIPlayers = state.AI.players.map((player, index) => {
            if (index !== state.AI.AIInPlay ){
                return player;
            } 
            return update(player, {
                hand : {$set : newAIHand},
                message : {
                    text : {$set : "Does anyone want this?"},
                    timestamp : {$set : Date.now()}
                }
            });
        });

        newState = update (state, {
            game : {gameState : {$set : newGameState}, gameUpdate : {$set : newGameUpdate}},
            AI : {
                AIInPlay : {$set : newAIInPlay},
                players : {$set : newAIPlayers},
                messageUpdate : {$set : messageUpdate}
            },
            discard : {$set : newDiscard},
            discardCovered : {$set : false},
            claimChoice : {$set : null}
        });


        return newState;
    }

    if (action.type === actions.UPDATE_PLAYER_HAND) {
        
        newState = update (state, {
            game : {gameUpdate : {$set : false}},
            player : {hand : {$set : action.payload.newHand}, cardSelected : {$set : null}},
            AI : {messageUpdate : {$set : null}}
        });


        return newState;
    }

    if (action.type === actions.SHOW_GOING_DOWN_MODAL) {
        
        newState = update (state, {
            game : {gameUpdate : {$set : false}},
            player : {isGoingDown : {$set : true}, cardSelected : {$set : null}},
            AI : {messageUpdate : {$set : null}}
        });


        return newState;
    }

    if (action.type === actions.CANCEL_PLAYER_GO_DOWN) {
        
        newState = update (state, {
            game : {gameUpdate : {$set : false}},
            player : {isGoingDown : {$set : false}},
            AI : {messageUpdate : {$set : null}}
        });


        return newState;
    }

    if (action.type === actions.GO_DOWN_SUBMIT_HAND) {
        let player = _.cloneDeep(state.player);
        player.isGoingDown = false;
        player.hand = action.payload.hand;
        player.cardSelected = null;
        player.isDown = true;
        player.table = action.payload.table;

        newState = update (state, {
            game : {gameUpdate : {$set : false}},
            player : {$set : player},
            AI : {messageUpdate : {$set : null}}
        });


        return newState;
    }

    if (action.type === actions.AI_GO_DOWN_SUBMIT) {

        let newHand = action.payload.hand;
        //let discardCard = newHand.splice(0, 1);
        //let newDiscard = [...state.discard];
        //newDiscard.unshift(discardCard[0]);

        let AI = _.cloneDeep(state.AI);

        AI.players[state.AI.AIInPlay].hand = newHand;
        AI.players[state.AI.AIInPlay].isDown = true;
        AI.players[state.AI.AIInPlay].table = action.payload.table;
        AI.players[state.AI.AIInPlay].message = {
            text : "Right, I'm putting my cards down now.",
            timestamp : Date.now()
        }
        AI.messageUpdate = [state.AI.AIInPlay];
        newState = update (state, {
            game : {gameUpdate : {$set : true}},
            AI : {$set : AI}
        });


        return newState;
    }

    if (action.type === actions.AI_ADD_CARD_TO_TABLE) {
        //this.props.AIAddCardToTable(newSetrun, newHand, playerType, setrunIndex, AIIndex)
        let table;

        let AI = _.cloneDeep(state.AI);
        AI.players[state.AI.AIInPlay].hand = action.payload.newHand;
        AI.messageUpdate = null;
        if (action.payload.playerType === "player") { 
            table = _.cloneDeep(state.player.table);
            table[action.payload.setrunIndex] = action.payload.newSetrun;
            newState = update (state, {
                game : {gameUpdate : {$set : true}},
                player : {
                    cardSelected : {$set : null},
                    table : {$set : table}
                },
                AI : {$set : AI}
            });
        } else {
            AI.players[action.payload.AIIndex].table[action.payload.setrunIndex] = action.payload.newSetrun;

            newState = update (state, {
                game : {gameUpdate : {$set : true}},
                AI : {$set : AI}
            });
        }


        return newState;
    }

    if (action.type === actions.PLAYER_ADD_CARD_TO_TABLE) {
        let hand = _.clone(state.player.hand);
        hand.splice(state.player.cardSelected, 1);
        // a red ace replaced by its natural card comes back to the player
        if (action.payload.returnedAce) hand.push(action.payload.returnedAce);
        let newCard = action.payload.returnedAce
            ? {id : action.payload.returnedAce.id, label : "Back"}
            : state.player.newCard;
        let table;
        if (action.payload.playerType === "player") { 
            table = _.cloneDeep(state.player.table);
            table[action.payload.setrunIndex] = action.payload.newSetrun;
            newState = update (state, {
                game : {gameUpdate : {$set : false}},
                player : {
                    hand : {$set : hand},
                    cardSelected : {$set : null},
                    newCard : {$set : newCard},
                    table : {$set : table}
                },
                AI : {messageUpdate : {$set : null}}
            });
        } else {
            let AI = _.cloneDeep(state.AI);
            AI.players[action.payload.AIIndex].table[action.payload.setrunIndex] = action.payload.newSetrun;
            AI.players[action.payload.AIIndex].message = {
                text : "Woah, steady there!",
                timestamp : Date.now()
            }
            AI.messageUpdate = [action.payload.AIIndex];
            newState = update (state, {
                game : {gameUpdate : {$set : false}},
                player : {
                    hand : {$set : hand},
                    cardSelected : {$set : null},
                    newCard : {$set : newCard}
                },
                AI : {$set : AI}
            });
        }
        

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
        AI.messageUpdate = null;
        newState = update (state, {
            game : {gameState : {$set : GAME_STATES.ROUND_END}, gameUpdate : {$set : false}},
            player : {$set : player},
            AI : {$set : AI},
            UI : {endOfRound : {$set : true}}
        });


        return newState;
    }

    if (action.type === actions.REMOVE_AI_MESSAGE) {
        let AI = _.cloneDeep(state.AI);
        action.payload.AIIndex.forEach((AIIndex) => {
            AI.players[AIIndex].message.text = "";
        })
        AI.messageUpdate = null;
        newState = update (state, {
            AI : {$set : AI},
            game : {gameUpdate : {$set : false}}
            
        });


        return newState;
    }

    if (action.type === actions.RESHUFFLE_DISCARD) {

        newState = update (state, {
            game : {gameUpdate : {$set : false}},
            deck : {$set : action.payload.deck},
            discard : {$set : action.payload.discard},
            AI : {messageUpdate : {$set : null}}
        });

        return newState;
    }

    return state;
}

export default withLog(reducer);