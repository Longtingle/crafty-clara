const GAME_STATES = {
    NO_GAME : "NO_GAME",
    PW_DRAW_CARD : "PW_DRAW_CARD",
    PW_PLAY : "PW_PLAY",
    AI_DRAW : "AI_DRAW",
    AI_WAIT_ONE : "AI_WAIT_ONE",
    AI_DRAW_OOT : "AI_DRAW_OOT",
    AI_WAIT_TWO : "AI_WAIT_TWO",
    AI_OOT_RESOLVE : "AI_OOT_RESOLVE",
    AI_PLAY : "AI_PLAY",
    ROUND_END : "ROUND_END",
    GAME_END : "GAME_END"
};

const AI_CARD_SELECT = { 
    SELECT_DECK : "SELECT_DECK",
    SELECT_DISCARD : "SELECT_DISCARD"
};

const ENV_VAR = {
    IMG_DIR : "http://localhost:3000/img"
    //IMG_DIR : "http://81.103.140.192:3000/img"
}

const SET = "SET";
const RUN = "RUN";

const ROUND_REQUIREMENTS = [
    {S : 2, R: 0},
    {S : 1, R: 1},
    {S : 0, R: 2},
    {S : 3, R: 0},
    {S : 2, R: 1},
    {S : 1, R: 2},
    {S : 0, R: 3}
]


export default GAME_STATES;
export {AI_STAGES, AI_CARD_SELECT, ENV_VAR, ROUND_REQUIREMENTS, SET, RUN};