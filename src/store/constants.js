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
    // files in /public are served from the app's base URL
    IMG_DIR : import.meta.env.BASE_URL + "img"
}

// How long the AI pauses (ms), so the human can follow its moves and claim
// its discards.
const AI_PACE = {
    // before an AI draws, as the turn passes to it
    turnStart : 1000,
    // each half of the claim window after an AI draws from the deck; the
    // human's claim or pass ends it early
    claimWait : 3000,
    // between an AI's moves: going down, each card added, the discard
    move : 800
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
export {AI_CARD_SELECT, AI_PACE, ENV_VAR, ROUND_REQUIREMENTS, SET, RUN};