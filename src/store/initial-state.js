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
        showModalBack : false,
        goingDown : {
            selectedCards : [],
            submittedSetruns : []
        },
        endOfRound : false
    },
    player : {
        hand : [],
        cardSelected : null,
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
    OOTRequests : []
}

export default initialState;