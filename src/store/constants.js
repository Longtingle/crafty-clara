const GAME_STATES = {
    NO_GAME : "NO_GAME",
    PW_DRAW_CARD : "PW_DRAW_CARD",
    PW_PLAY : "PW_PLAY",
    AI_DRAW : "AI_DRAW",
    AI_WAIT : "AI_WAIT",
    AI_DRAW_OOT : "AI_DRAW_OOT",
    AI_PLAY : "AI_PLAY",
    ROUND_END : "ROUND_END"
};

const AI_STAGES = {
    AI_DRAW : "AI_DRAW",
    AI_PLAY : "AI_PLAY",
    AI_WAIT : "AI_WAIT"
}

const AI_CARD_SELECT = { 
    SELECT_DECK : "SELECT_DECK",
    SELECT_DISCARD : "SELECT_DISCARD"
};

const ENV_VAR = {
    IMG_DIR : "http://localhost:3000/img"
    //IMG_DIR : "http://81.103.140.192:3000/img"
}



export default GAME_STATES;
export {AI_STAGES, AI_CARD_SELECT, ENV_VAR};