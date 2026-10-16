// The game itself: its state, the commands players send, and the rules that
// apply them. Every function here is pure. Time comes in as `now` and
// randomness from the seeded generator in the state, so the same code can run
// in the page for one player or on a server for several, and a game replays
// exactly from its seed and its commands.
//
// The engine treats every seat the same. Whether a seat is the person at this
// screen, someone online or a bot is up to the host that runs the game.

import {RUN, SET, ROUND_REQUIREMENTS, SUITS, createCard, getPoints, type Card, type Requirement, type Setrun, type SetrunType} from './cards.ts';
import {addToSetrun, checkSetrun, explainSetrun, type RunEnd} from './setruns.ts';
import {requirementText} from './card-names.ts';
import {random, shuffle} from './random.ts';
import {STATE_VERSION} from './upgrade.ts';

export const HAND_SIZE = 12;
const DECKS = 2;
// Two decks could deal 12 cards to 8, but with more than 6 the deck is too
// thin to play from.
const MAX_SEATS = 6;
// Once everyone is down, the cards left may fit no setrun on the table, and
// then nobody can ever go out. So when the deck runs out for the third time
// (after two reshuffles), the round ends at the end of that turn.
const MAX_RESHUFFLES = 2;

/** "look" is the start of a round, before play starts, while everyone looks over their hand. */
export type Phase = "look" | "draw" | "play" | "roundEnd" | "gameEnd";
export type Answer = "claim" | "pass";

export interface SeatState {
    name: string;
    hand: Card[];
    /** the setruns they have laid down this round */
    table: Setrun[];
    isDown: boolean;
    /** points for each round played */
    scores: number[];
    /** for each round played, whether they got down */
    downs: boolean[];
    /** once the round is over: whether they are ready for the next */
    ready: boolean;
}

/**
 * When the player in turn draws from the deck, the other players may claim
 * the top discard. Everyone may ask for it, and the first in line who asks
 * gets it. The window closes once everyone has answered; or once it's
 * settled (the first in line has claimed it, say) and it has been open a
 * while (`shownUntil`), so nobody sees it come and go in a flash; or at its
 * deadline, when anyone who hasn't answered passes.
 */
export interface ClaimWindow {
    /** id of the card on offer, the top discard */
    card: string;
    /** when the window closes, on the host's clock (ms) */
    deadline: number;
    /** until when a window that's settled stays open, unless everyone has answered */
    shownUntil: number;
    /** the seats that may claim, in line: from the player in turn onwards */
    seats: number[];
    /** each seat's answer, by seat (null: not answered, or can't claim) */
    answers: (Answer | null)[];
}

/**
 * At the start of a round, everyone gets a while to look over their hand
 * before anyone moves. Play starts once every seat is ready, or at the
 * deadline.
 */
export interface LookTime {
    /** when play starts, on the host's clock (ms) */
    deadline: number;
    /** whether each seat is ready to start, by seat */
    ready: boolean[];
}

/** A setrun on the table: whose it is and which of theirs. */
export interface Target {
    seat: number;
    index: number;
}

/** What happened this round, for the activity log. Views hide the card another seat drew from the deck. */
export type LogEntry =
    | {type: "draw"; seat: number; from: "deck"; card: Card | null}
    | {type: "draw"; seat: number; from: "discard"; card: Card}
    /** beaten: those further back in line who asked for it too */
    | {type: "claim"; seat: number; card: Card; beaten?: number[]}
    | {type: "discard"; seat: number; card: Card}
    | {type: "goDown"; seat: number}
    | {type: "add"; seat: number; card: Card; target: Target; returnedAce: Card | null}
    | {type: "reshuffle"; seat: number}
    | {type: "out"; seat: number}
    /** the round ended at the end of this seat's turn because the deck had run out for the last time */
    | {type: "deckOut"; seat: number};

/** What a seat can do. Cards are named by id. */
export type Command =
    | {type: "draw"; from: "deck" | "discard"}
    | {type: "claim"}
    | {type: "pass"}
    /** a run that could be laid out more than one way (a red ace at either end) starts `from` that value */
    | {type: "goDown"; setruns: {type: SetrunType; cards: string[]; from?: number}[]}
    /** on a run, `end` says which end, where the card could go at either */
    | {type: "addToSetrun"; card: string; target: Target; end?: RunEnd}
    | {type: "discard"; card: string}
    /** ready to start play, having looked over your hand */
    | {type: "start"}
    /** ready for the next round, which is dealt once every seat is ready */
    | {type: "ready"};

/**
 * Why a command was refused: it came too late, crossing with the game moving
 * on (a claim window closing, play starting, an answer already given), which
 * is nobody's fault; or it broke the rules. The host adds "malformed", for a
 * command that isn't one at all (parseCommand).
 */
export type RefusalCode = "late" | "illegal" | "malformed";

export type Result = {ok: true; state: GameState} | {ok: false; error: string; code: RefusalCode};

export interface GameState {
    /** which shape of state this is (STATE_VERSION): a saved game from before is brought up to date by upgradeState */
    version: number;
    /** the random generator's state (random.ts) */
    rng: number;
    /** card ids are this game's prefix and a number */
    idPrefix: string;
    nextId: number;
    claimWindowMs: number;
    /** how long a claim window stays open, at least, unless everyone has answered (ms) */
    claimShowMs: number;
    /** how long everyone has to look over their hand at the start of a round (ms); 0 for no time */
    lookMs: number;
    /** 0 to ROUND_REQUIREMENTS.length - 1 */
    round: number;
    phase: Phase;
    /** whose turn it is, or whose turn ended the round */
    turn: number;
    seats: SeatState[];
    /** top card first */
    deck: Card[];
    /** top card first */
    discard: Card[];
    /** who discarded the top card: null for the card turned up at the deal, and once the top card is taken */
    discardedBy: number | null;
    /** how many times the discard pile has been shuffled into the deck this round */
    reshuffles: number;
    claim: ClaimWindow | null;
    /** while the round is starting (phase "look") */
    look: LookTime | null;
    /** this round, oldest first */
    log: LogEntry[];
    /** who went out, once the round is over; null if the round ended because the deck ran out */
    wentOut: number | null;
    /** who went out of each round played, as wentOut */
    outs: (number | null)[];
}

export interface GameOptions {
    /** one per seat, in turn order */
    names: string[];
    seed: number;
    /** how long the other players have to claim a discard (ms) */
    claimWindowMs?: number;
    /** how long a claim window stays open at least, unless everyone has answered (ms); none by default */
    claimShowMs?: number;
    /** how long everyone has to look over their hand at the start of each round (ms); none by default */
    lookMs?: number;
    /** the time on the host's clock as the game starts, for the first round's look time */
    now?: number;
}

export const requirementFor = (round: number): Requirement => ROUND_REQUIREMENTS[round];

export const createGame = ({names, seed, claimWindowMs = 6000, claimShowMs = 0, lookMs = 0, now = 0}: GameOptions): GameState => {
    if (names.length < 2 || names.length > MAX_SEATS) {
        throw new Error("A game needs 2 to " + MAX_SEATS + " players");
    }
    let state: GameState = {
        version : STATE_VERSION,
        rng : seed | 0,
        idPrefix : "",
        nextId : 1,
        claimWindowMs,
        claimShowMs,
        lookMs,
        round : 0,
        phase : "draw",
        turn : 0,
        seats : names.map(name => ({name, hand : [], table : [], isDown : false, scores : [], downs : [], ready : false})),
        deck : [],
        discard : [],
        discardedBy : null,
        reshuffles : 0,
        claim : null,
        look : null,
        log : [],
        wentOut : null,
        outs : []
    };
    state.idPrefix = Math.floor(random(state) * 36 ** 4).toString(36).padStart(4, "0");
    deal(state, now);
    return state;
};

/** Applies a seat's command, or says why it can't be done. */
export const apply = (state: GameState, seat: number, command: Command, now: number): Result => {
    let next = structuredClone(state);
    let error = run(next, seat, command, now);
    if (!error) return {ok : true, state : next};
    return {ok : false, error, code : tooLate(next, seat, command) ? "late" : "illegal"};
};

// Whether a refused command only crossed with the game moving on: an answer
// to a claim window that has closed, or that was already answered; a start
// once play has started, or already said; ready, already said. `state` is as
// the command found it.
const tooLate = (state: GameState, seat: number, command: Command): boolean => {
    switch (command.type) {
        case "claim":
        case "pass": return state.claim === null || state.claim.answers[seat] !== null;
        case "start": return state.look === null || state.look.ready[seat];
        case "ready": return state.seats[seat]?.ready === true;
        default: return false;
    }
};

/** When the game next moves on by itself: the claim window closes, or play starts. Null if it waits for a player. */
export const nextDeadline = (state: GameState): number | null => {
    let claim = state.claim;
    if (claim) return outcome(claim, false).settled ? Math.min(claim.shownUntil, claim.deadline) : claim.deadline;
    return state.look?.deadline ?? null;
};

/** Closes the claim window, or starts play, if its deadline has passed. The host calls this when the deadline comes. */
export const expire = (state: GameState, now: number): GameState => {
    let deadline = nextDeadline(state);
    if (deadline === null || now < deadline) return state;
    let next = structuredClone(state);
    expireDeadlines(next, now);
    return next;
};

/** Whether drawing from the deck is possible: it has cards, or the discard pile can be shuffled into it. */
export const canDrawFromDeck = (state: Pick<GameState, "deck" | "discard">): boolean =>
    state.deck.length > 0 || state.discard.length > 1;

// The rest change `state` in place. They are only ever given apply's or
// createGame's copy.

// Deals a round. The first player moves one seat on each round. Everyone then
// has a while to look over their hand, if the game gives them one.
const deal = (state: GameState, now: number): void => {
    let cards: Card[] = [];
    for (let value = 1; value <= 13; value++) {
        for (let suit of SUITS) {
            for (let copy = 0; copy < DECKS; copy++) cards.push(createCard(value, suit, ""));
        }
    }
    let deck = withNewIds(state, shuffle(state, cards));
    for (let seat of state.seats) {
        seat.hand = deck.splice(0, HAND_SIZE);
        seat.table = [];
        seat.isDown = false;
        seat.ready = false;
    }
    state.discard = deck.splice(0, 1);
    state.deck = deck;
    state.discardedBy = null;
    state.reshuffles = 0;
    state.claim = null;
    state.log = [];
    state.wentOut = null;
    state.turn = state.round % state.seats.length;
    if (state.lookMs > 0) {
        state.phase = "look";
        state.look = {deadline : now + state.lookMs, ready : state.seats.map(() => false)};
    } else {
        state.phase = "draw";
        state.look = null;
    }
};

const startPlay = (state: GameState): void => {
    state.look = null;
    state.phase = "draw";
};

// A deadline that has passed: the claim window closes, with anyone who
// hasn't answered passing, or a settled one has been open long enough; or
// play starts.
const expireDeadlines = (state: GameState, now: number): void => {
    if (state.claim) settleClaims(state, now);
    if (state.look && now >= state.look.deadline) startPlay(state);
};

// Cards are numbered in their new order whenever they are shuffled, so an id
// says nothing about a card, and nobody can follow a card through a shuffle.
const withNewIds = (state: GameState, cards: Card[]): Card[] =>
    cards.map(card => ({...card, id : state.idPrefix + "-" + state.nextId++}));

const run = (state: GameState, seat: number, command: Command, now: number): string | null => {
    if (!Number.isInteger(seat) || !state.seats[seat]) return "There's no seat " + seat;
    // a command that arrives after a deadline finds the window closed, or play started
    expireDeadlines(state, now);

    switch (command.type) {
        case "draw": return draw(state, seat, command.from, now);
        case "claim":
        case "pass": return answerClaim(state, seat, command.type, now);
        case "goDown": return goDown(state, seat, command.setruns);
        case "addToSetrun": return addCard(state, seat, command.card, command.target, command.end);
        case "discard": return discard(state, seat, command.card);
        case "start": return readyToStart(state, seat);
        case "ready": return ready(state, seat, now);
        default: return "Unknown command";
    }
};

const checkTurn = (state: GameState, seat: number, phase: Phase): string | null => {
    if (state.phase === "roundEnd" || state.phase === "gameEnd") return "The round is over";
    if (state.phase === "look") return "Play hasn't started yet";
    if (seat !== state.turn) return "It's not your turn";
    if (state.phase !== phase) return (phase === "draw") ? "You've already drawn" : "Draw a card first";
    return null;
};

const draw = (state: GameState, seat: number, from: "deck" | "discard", now: number): string | null => {
    let error = checkTurn(state, seat, "draw");
    if (error) return error;
    let hand = state.seats[seat].hand;

    if (from === "discard") {
        let card = state.discard.shift();
        if (!card) return "The discard pile is empty";
        hand.push(card);
        state.discardedBy = null;
        state.log.push({type : "draw", seat, from, card});
        state.phase = "play";
        return null;
    }

    // the log shows everyone a card drawn from anywhere but the deck
    if (from !== "deck") return "Draw from the deck or the discard pile";
    if (!canDrawFromDeck(state)) return "The deck is empty";
    if (state.deck.length === 0) {
        // everything but the top discard is shuffled into a new deck
        state.deck = withNewIds(state, shuffle(state, state.discard.slice(1)));
        state.discard = state.discard.slice(0, 1);
        state.reshuffles++;
        state.log.push({type : "reshuffle", seat});
    }
    let card = state.deck.shift()!;
    hand.push(card);
    state.log.push({type : "draw", seat, from, card});
    state.phase = "play";
    openClaims(state, now);
    return null;
};

// Everyone but the player in turn and whoever discarded the card may claim it.
const openClaims = (state: GameState, now: number): void => {
    let top = state.discard[0];
    if (!top) return;
    let count = state.seats.length;
    let seats: number[] = [];
    for (let i = 1; i < count; i++) {
        let seat = (state.turn + i) % count;
        if (seat !== state.discardedBy) seats.push(seat);
    }
    if (seats.length === 0) return;
    state.claim = {
        card : top.id,
        deadline : now + state.claimWindowMs,
        shownUntil : now + state.claimShowMs,
        seats,
        answers : state.seats.map(() => null)
    };
};

const answerClaim = (state: GameState, seat: number, answer: Answer, now: number): string | null => {
    let claim = state.claim;
    if (!claim || !claim.seats.includes(seat)) return "There's no discard for you to claim";
    if (claim.answers[seat] !== null) return "You've already answered";
    claim.answers[seat] = answer;
    settleClaims(state, now);
    return null;
};

// Who gets the discard: the first seat in line that claimed it, once
// everyone ahead of them has passed, or nobody, once everyone has passed.
// When `closing`, seats that haven't answered pass.
const outcome = (claim: ClaimWindow, closing: boolean): {settled: boolean; winner: number | null} => {
    for (let seat of claim.seats) {
        let answer = claim.answers[seat];
        if (answer === "claim") return {settled : true, winner : seat};
        if (answer === null && !closing) return {settled : false, winner : null};
    }
    return {settled : true, winner : null};
};

// Closes the claim window, if it's time (see ClaimWindow), and gives the
// discard to whoever gets it.
const settleClaims = (state: GameState, now: number): void => {
    let claim = state.claim!;
    let closing = now >= claim.deadline;
    let {settled, winner} = outcome(claim, closing);
    if (!settled) return;
    let everyone = claim.seats.every(seat => claim.answers[seat] !== null);
    if (!closing && !everyone && now < claim.shownUntil) return;
    if (winner !== null) {
        let card = state.discard.shift()!;
        state.seats[winner].hand.push(card);
        state.discardedBy = null;
        let beaten = claim.seats.filter(seat => seat !== winner && claim.answers[seat] === "claim");
        state.log.push(beaten.length > 0 ? {type : "claim", seat : winner, card, beaten} : {type : "claim", seat : winner, card});
    }
    state.claim = null;
};

// The cards with these ids, in this order, or null if any isn't in the hand.
const findCards = (hand: Card[], ids: string[]): Card[] | null => {
    let cards = ids.map(id => hand.find(card => card.id === id));
    return cards.every((card): card is Card => card !== undefined) ? cards : null;
};

const goDown = (state: GameState, seat: number, setruns: {type: SetrunType; cards: string[]; from?: number}[]): string | null => {
    let error = checkTurn(state, seat, "play");
    if (error) return error;
    let player = state.seats[seat];
    if (player.isDown) return "You're already down";

    let requirement = requirementFor(state.round);
    let sets = setruns.filter(setrun => setrun.type === SET).length;
    let runs = setruns.filter(setrun => setrun.type === RUN).length;
    if (sets !== requirement.S || runs !== requirement.R || sets + runs !== setruns.length) {
        return "This round you go down with " + requirementText(requirement);
    }
    let ids = setruns.flatMap(setrun => setrun.cards);
    if (new Set(ids).size !== ids.length) return "A card can only go in one setrun";

    let table: Setrun[] = [];
    for (let setrun of setruns) {
        let cards = findCards(player.hand, setrun.cards);
        if (!cards) return "That card isn't in your hand";
        let result = checkSetrun(cards, setrun.type, setrun.from);
        if (!result.valid) return explainSetrun(cards, setrun.type) ?? "Those cards can't be laid out that way";
        table.push(result.setrun);
    }
    player.table = table;
    player.hand = player.hand.filter(card => !ids.includes(card.id));
    player.isDown = true;
    state.log.push({type : "goDown", seat});
    endRoundIfOut(state, seat);
    return null;
};

const addCard = (state: GameState, seat: number, cardId: string, target: Target, end?: RunEnd): string | null => {
    let error = checkTurn(state, seat, "play");
    if (error) return error;
    let player = state.seats[seat];
    if (!player.isDown) return "Go down before adding to setruns";
    let card = player.hand.find(card => card.id === cardId);
    if (!card) return "That card isn't in your hand";
    let owner = state.seats[target.seat];
    let setrun = owner?.table[target.index];
    if (!setrun) return "There's no setrun there";
    let result = addToSetrun(setrun, card, end);
    if (!result.valid) return "That card doesn't fit there";

    owner.table[target.index] = result.setrun;
    player.hand = player.hand.filter(other => other !== card);
    // a red ace replaced by the card it stood in for goes back to the hand
    if (result.returnedAce) player.hand.push(result.returnedAce);
    state.log.push({type : "add", seat, card, target, returnedAce : result.returnedAce});
    endRoundIfOut(state, seat);
    return null;
};

const discard = (state: GameState, seat: number, cardId: string): string | null => {
    let error = checkTurn(state, seat, "play");
    if (error) return error;
    if (state.claim) return "Wait until the other players have claimed or passed";
    let player = state.seats[seat];
    let card = player.hand.find(card => card.id === cardId);
    if (!card) return "That card isn't in your hand";

    player.hand = player.hand.filter(other => other !== card);
    state.discard.unshift(card);
    state.discardedBy = seat;
    state.log.push({type : "discard", seat, card});
    if (endRoundIfOut(state, seat)) return null;
    if (state.deck.length === 0 && state.reshuffles >= MAX_RESHUFFLES) {
        state.log.push({type : "deckOut", seat});
        endRound(state, null);
        return null;
    }
    state.turn = (seat + 1) % state.seats.length;
    state.phase = "draw";
    return null;
};

const readyToStart = (state: GameState, seat: number): string | null => {
    let look = state.look;
    if (!look) return "Play has already started";
    if (look.ready[seat]) return "Waiting for the other players";
    look.ready[seat] = true;
    if (look.ready.every(Boolean)) startPlay(state);
    return null;
};

const ready = (state: GameState, seat: number, now: number): string | null => {
    if (state.phase === "gameEnd") return "The game is over";
    if (state.phase !== "roundEnd") return "The round isn't over";
    if (state.seats[seat].ready) return "Waiting for the other players";
    state.seats[seat].ready = true;
    if (state.seats.every(player => player.ready)) {
        state.round++;
        deal(state, now);
    }
    return null;
};

// A round ends as soon as a player has no cards left.
const endRoundIfOut = (state: GameState, seat: number): boolean => {
    if (state.seats[seat].hand.length > 0) return false;
    state.log.push({type : "out", seat});
    endRound(state, seat);
    return true;
};

// Everyone scores the cards left in their hand.
const endRound = (state: GameState, wentOut: number | null): void => {
    for (let player of state.seats) {
        player.scores.push(getPoints(player.hand));
        player.downs.push(player.isDown);
    }
    state.wentOut = wentOut;
    state.outs.push(wentOut);
    state.claim = null;
    state.phase = (state.round === ROUND_REQUIREMENTS.length - 1) ? "gameEnd" : "roundEnd";
};
