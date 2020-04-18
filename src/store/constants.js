const GAME_STATES = {
    NO_GAME : "NO_GAME",
    PW_DRAW_CARD : "PW_DRAW_CARD",
    PW_PLAY : "PW_PLAY",
    AI_DRAW : "AI_DRAW",
    PW_DRAW_OOT : "PW_DRAW_OOT",
    AI_DRAW_OOT : "AI_DRAW_OOT",
    AI_PLAY : "AI_PLAY",
    ROUND_END : "ROUND_END"
};

const CARD_SELECT = { 
    SELECT_DECK : "SELECT_DECK",
    SELECT_DISCARD : "SELECT_DISCARD"
};

const ENV_VAR = {
    IMG_DIR : "http://81.103.140.192:3000/img"
}



export default GAME_STATES;
export {CARD_SELECT, ENV_VAR};