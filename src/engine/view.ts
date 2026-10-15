// What one seat is allowed to see of the game. The host sends each seat its
// view after every change, so a seat never holds another player's cards or
// the order of the deck.

import {ROUND_REQUIREMENTS, type Card, type Requirement, type Setrun} from './cards.ts';
import {canDrawFromDeck, type Answer, type GameState, type LogEntry, type Phase} from './game.ts';

export interface SeatView {
    name: string;
    /** ids of the cards in their hand: enough to follow a card in and out, not to see it */
    cards: string[];
    table: Setrun[];
    isDown: boolean;
    /** points for each round played */
    scores: number[];
    /** for each round played, whether they got down */
    downs: boolean[];
    total: number;
    /** once the round is over: whether they are ready for the next */
    ready: boolean;
}

export interface ClaimView {
    /** the discard on offer */
    card: Card;
    /** ms until the window closes, when the view was made */
    closesIn: number;
    /** the seats that may claim it */
    seats: number[];
    /** whether you can still claim or pass */
    canAnswer: boolean;
    answer: Answer | null;
}

export interface GameView {
    /** whose view this is */
    seat: number;
    round: number;
    rounds: number;
    requirement: Requirement;
    phase: Phase;
    turn: number;
    /** your cards */
    hand: Card[];
    seats: SeatView[];
    /** top is the id of the top card, so a card can be followed out of the deck */
    deck: {count: number; top: string | null; canDraw: boolean};
    /** top card first */
    discard: Card[];
    claim: ClaimView | null;
    /** this round, oldest first */
    log: LogEntry[];
    /** who went out, once the round is over; null if the deck ran out */
    wentOut: number | null;
    /** who went out of each round played, as wentOut */
    outs: (number | null)[];
}

// Views share objects with the state, which is never changed once made, so
// treat them as read-only.
export const viewFor = (state: GameState, seat: number, now: number): GameView => {
    let claim = state.claim;
    return {
        seat,
        round : state.round,
        rounds : ROUND_REQUIREMENTS.length,
        requirement : ROUND_REQUIREMENTS[state.round],
        phase : state.phase,
        turn : state.turn,
        hand : state.seats[seat].hand,
        seats : state.seats.map(player => ({
            name : player.name,
            cards : player.hand.map(card => card.id),
            table : player.table,
            isDown : player.isDown,
            scores : player.scores,
            downs : player.downs,
            total : player.scores.reduce((sum, score) => sum + score, 0),
            ready : player.ready
        })),
        deck : {count : state.deck.length, top : state.deck[0]?.id ?? null, canDraw : canDrawFromDeck(state)},
        discard : state.discard,
        claim : claim && {
            card : state.discard[0],
            closesIn : Math.max(0, claim.deadline - now),
            seats : claim.seats,
            canAnswer : claim.seats.includes(seat) && claim.answers[seat] === null,
            answer : claim.answers[seat]
        },
        log : state.log.map(entry => (entry.type === "draw" && entry.from === "deck" && entry.seat !== seat)
            ? {...entry, card : null}
            : entry),
        wentOut : state.wentOut,
        outs : state.outs
    };
};
