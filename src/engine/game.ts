// The game itself: its state, the commands players send, and the rules that
// apply them. Every function here is pure. Time comes in as `now` and
// randomness from the seeded generator in the state, so the same code can run
// in the page for one player or on a server for several, and a game replays
// exactly from its seed and its commands.
//
// The engine treats every seat the same. Whether a seat is the person at this
// screen, someone online or a bot is up to the host that runs the game.

import {RUN, SET, ROUND_REQUIREMENTS, SUITS, createCard, getPoints, type Card, type Requirement, type Setrun, type SetrunType} from './cards.ts';
import {addToSetrun, checkSetrun, explainSetrun} from './setruns.ts';
import {requirementText} from './card-names.ts';
import {random, shuffle} from './random.ts';

export const HAND_SIZE = 12;
const DECKS = 2;
// Two decks could deal 12 cards to 8, but with more than 6 the deck is too
// thin to play from.
const MAX_SEATS = 6;
// Once everyone is down, the cards left may fit no setrun on the table, and
// then nobody can ever go out. So when the deck runs out for the third time
// (after two reshuffles), the round ends at the end of that turn.
const MAX_RESHUFFLES = 2;

export type Phase = "draw" | "play" | "roundEnd" | "gameEnd";
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
 * the top discard. The first in line who claims it gets it, so the window
 * closes as soon as that is settled, or at its deadline, when anyone who
 * hasn't answered passes.
 */
export interface ClaimWindow {
    /** id of the card on offer, the top discard */
    card: string;
    /** when the window closes, on the host's clock (ms) */
    deadline: number;
    /** the seats that may claim, in line: from the player in turn onwards */
    seats: number[];
    /** each seat's answer, by seat (null: not answered, or can't claim) */
    answers: (Answer | null)[];
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
    | {type: "claim"; seat: number; card: Card}
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
    | {type: "goDown"; setruns: {type: SetrunType; cards: string[]}[]}
    | {type: "addToSetrun"; card: string; target: Target}
    | {type: "discard"; card: string}
    /** ready for the next round, which is dealt once every seat is ready */
    | {type: "ready"};

export type Result = {ok: true; state: GameState} | {ok: false; error: string};

export interface GameState {
    /** the random generator's state (random.ts) */
    rng: number;
    /** card ids are this game's prefix and a number */
    idPrefix: string;
    nextId: number;
    claimWindowMs: number;
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
}

export const requirementFor = (round: number): Requirement => ROUND_REQUIREMENTS[round];

export const createGame = ({names, seed, claimWindowMs = 6000}: GameOptions): GameState => {
    if (names.length < 2 || names.length > MAX_SEATS) {
        throw new Error("A game needs 2 to " + MAX_SEATS + " players");
    }
    let state: GameState = {
        rng : seed | 0,
        idPrefix : "",
        nextId : 1,
        claimWindowMs,
        round : 0,
        phase : "draw",
        turn : 0,
        seats : names.map(name => ({name, hand : [], table : [], isDown : false, scores : [], downs : [], ready : false})),
        deck : [],
        discard : [],
        discardedBy : null,
        reshuffles : 0,
        claim : null,
        log : [],
        wentOut : null,
        outs : []
    };
    state.idPrefix = Math.floor(random(state) * 36 ** 4).toString(36).padStart(4, "0");
    deal(state);
    return state;
};

/** Applies a seat's command, or says why it can't be done. */
export const apply = (state: GameState, seat: number, command: Command, now: number): Result => {
    let next = structuredClone(state);
    let error = run(next, seat, command, now);
    return error ? {ok : false, error} : {ok : true, state : next};
};

/** Closes the claim window if its deadline has passed. The host calls this when the deadline comes. */
export const expireClaims = (state: GameState, now: number): GameState => {
    if (!state.claim || now < state.claim.deadline) return state;
    let next = structuredClone(state);
    settleClaims(next, true);
    return next;
};

/** Whether drawing from the deck is possible: it has cards, or the discard pile can be shuffled into it. */
export const canDrawFromDeck = (state: Pick<GameState, "deck" | "discard">): boolean =>
    state.deck.length > 0 || state.discard.length > 1;

// The rest change `state` in place. They are only ever given apply's or
// createGame's copy.

// Deals a round. The first player moves one seat on each round.
const deal = (state: GameState): void => {
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
    state.phase = "draw";
};

// Cards are numbered in their new order whenever they are shuffled, so an id
// says nothing about a card, and nobody can follow a card through a shuffle.
const withNewIds = (state: GameState, cards: Card[]): Card[] =>
    cards.map(card => ({...card, id : state.idPrefix + "-" + state.nextId++}));

const run = (state: GameState, seat: number, command: Command, now: number): string | null => {
    if (!Number.isInteger(seat) || !state.seats[seat]) return "There's no seat " + seat;
    // a command that arrives after the deadline finds the window closed
    if (state.claim && now >= state.claim.deadline) settleClaims(state, true);

    switch (command.type) {
        case "draw": return draw(state, seat, command.from, now);
        case "claim":
        case "pass": return answerClaim(state, seat, command.type);
        case "goDown": return goDown(state, seat, command.setruns);
        case "addToSetrun": return addCard(state, seat, command.card, command.target);
        case "discard": return discard(state, seat, command.card);
        case "ready": return ready(state, seat);
        default: return "Unknown command";
    }
};

const checkTurn = (state: GameState, seat: number, phase: Phase): string | null => {
    if (state.phase === "roundEnd" || state.phase === "gameEnd") return "The round is over";
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
    state.claim = {card : top.id, deadline : now + state.claimWindowMs, seats, answers : state.seats.map(() => null)};
};

const answerClaim = (state: GameState, seat: number, answer: Answer): string | null => {
    let claim = state.claim;
    if (!claim || !claim.seats.includes(seat)) return "There's no discard for you to claim";
    if (claim.answers[seat] !== null) return "You've already answered";
    claim.answers[seat] = answer;
    settleClaims(state, false);
    return null;
};

// Gives the top discard to the first seat in line that claimed it, once
// everyone ahead of them has passed. When `closing`, seats that haven't
// answered pass.
const settleClaims = (state: GameState, closing: boolean): void => {
    let claim = state.claim!;
    for (let seat of claim.seats) {
        let answer = claim.answers[seat];
        if (answer === "claim") {
            let card = state.discard.shift()!;
            state.seats[seat].hand.push(card);
            state.discardedBy = null;
            state.log.push({type : "claim", seat, card});
            state.claim = null;
            return;
        }
        if (answer === null && !closing) return;
    }
    state.claim = null;
};

// The cards with these ids, in this order, or null if any isn't in the hand.
const findCards = (hand: Card[], ids: string[]): Card[] | null => {
    let cards = ids.map(id => hand.find(card => card.id === id));
    return cards.every((card): card is Card => card !== undefined) ? cards : null;
};

const goDown = (state: GameState, seat: number, setruns: {type: SetrunType; cards: string[]}[]): string | null => {
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
        let result = checkSetrun(cards, setrun.type);
        if (!result.valid) return explainSetrun(cards, setrun.type) ?? "Those cards don't make a " + setrun.type.toLowerCase();
        table.push(result.setrun);
    }
    player.table = table;
    player.hand = player.hand.filter(card => !ids.includes(card.id));
    player.isDown = true;
    state.log.push({type : "goDown", seat});
    endRoundIfOut(state, seat);
    return null;
};

const addCard = (state: GameState, seat: number, cardId: string, target: Target): string | null => {
    let error = checkTurn(state, seat, "play");
    if (error) return error;
    let player = state.seats[seat];
    if (!player.isDown) return "Go down before adding to setruns";
    let card = player.hand.find(card => card.id === cardId);
    if (!card) return "That card isn't in your hand";
    let owner = state.seats[target.seat];
    let setrun = owner?.table[target.index];
    if (!setrun) return "There's no setrun there";
    let result = addToSetrun(setrun, card);
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

const ready = (state: GameState, seat: number): string | null => {
    if (state.phase === "gameEnd") return "The game is over";
    if (state.phase !== "roundEnd") return "The round isn't over";
    if (state.seats[seat].ready) return "Waiting for the other players";
    state.seats[seat].ready = true;
    if (state.seats.every(player => player.ready)) {
        state.round++;
        deal(state);
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
