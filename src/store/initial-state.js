import GAME_STATES from './constants.js';
import params from '../game-functions/params.js';

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
        table : [],
        isDown : false,
        canGoDown : false,
        isGoingDown : false
    },
    AI : {
        players : [{
            name : "",
            hand : [], //cards in hand
            isDown : false, //has cards on table
            table : [{
                type : null, //will get set to "RUN" or "SET"
                cards : [] //array of cards in set or run
            }]
        }],
        AICount : params.numberOfPlayers - 1,
        AIInPlay : null,
    },
    deck : [],
    discard : [],
    OOTRequests : []
}

export default initialState;