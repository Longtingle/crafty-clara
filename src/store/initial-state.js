import GAME_STATES from './constants.js';
import params from '../game-functions/params.js';

const initialState = {
    debug : true,
    game : {
        gameState : GAME_STATES.NO_GAME,
        round : 0,
        requirement : 0,
        gameUpdate : false,
    },
    UI : {
        endOfRound : false
    },
    player : {
        hand : [],
        cardSelected : null,
        // the card just drawn, claimed or given back, tagged in the hand: {displayString, label}
        newCard : null,
        table : [],
        isDown : false,
        canGoDown : false,
        isGoingDown : false,
        points : {
            points : [],
            total : 0
        }
    },
    AI : {
        players : [{
            name : "",
            hand : [], //cards in hand
            isDown : false, //has cards on table
            table : [{
                type : null, //will get set to "RUN" or "SET"
                cards : [] //array of cards in set or run
            }],
            points : {
                points : [],
                total : 0
            },
            message : {
                text : "",
                timestamp : null
            }
        }],
        AICount : params.numberOfPlayers - 1,
        AIInPlay : null,
        messageUpdate : null
    },
    deck : [],
    discard : [],
    discardCovered : false,

    OOTRequests : [],
    // the human has asked to claim the top discard out of turn
    playerClaim : false,
    // what has happened this round, newest first (see log.js)
    log : []
}

export default initialState;