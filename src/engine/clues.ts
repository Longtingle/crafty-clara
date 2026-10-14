// What a bot works out about the other players from what it has seen this
// round: which cards each of them seems to be collecting, judged by what
// they picked up, passed over and threw away, and which cards are gone. A
// hard bot uses it to avoid discarding cards that would help someone else,
// and to collect setruns it can still finish.
//
// Its memory isn't perfect. It remembers each thing it saw with a chance that
// fades as turns go by. Its seed decides which things it remembers, so it
// doesn't change its mind from one move to the next, and once it has
// forgotten something it stays forgotten.

import {SET, SUITS, createCard, isRedAce, isWild, type Card, type SetrunType, type Suit} from './cards.ts';
import {addToSetrun} from './setruns.ts';
import {random} from './random.ts';
import type {GameView} from './view.ts';

export interface Memory {
    /** decides which things are remembered */
    seed: number;
    /** the chance of remembering something just seen */
    fresh: number;
    /** how much of that chance is left after each turn */
    fade: number;
}

export interface Clues {
    /** how much a seat seems to want a card, from 0 to 1 */
    wants(seat: number, card: Card): number;
    /** the chance that a card you discard goes to someone it helps, from 0 to 1 */
    danger(card: Card): number;
    /** how many copies of a card are out of your reach, as far as you know: on the tables, or seen discarded or taken */
    gone(value: number, suit: Suit): number;
    /**
     * For an unfinished set or run, how many cards that would grow it are
     * still to be had, each discounted by how much other players want it
     */
    outs(type: SetrunType, cards: Card[]): number;
}

/** Whether a bot remembers the log entry at `index` of a round, `age` turns after it happened. */
export const remembers = (memory: Memory, round: number, index: number, age: number): boolean => {
    let seeded = {rng : memory.seed ^ Math.imul(round + 1, 0x9E3779B1) ^ Math.imul(index + 1, 0x85EBCA77)};
    return random(seeded) < memory.fresh * memory.fade ** age;
};

// How much one sighting counts: taking a card says more than passing it over.
const TOOK = 1;
const THREW = -0.7;
const PASSED = -0.4;
// For runs, how much a card says about its neighbours in the suit, by distance.
const NEAR = [0, 1, 0.6];
// The chance that a card you discard reaches a seat that wants it: the next
// player can take it, and the others only by claiming it if the next player
// draws from the deck instead.
const NEXT_REACH = 1;
const OTHER_REACH = 0.5;
// How much another player wanting a card keeps it from you: the player just
// before you sees most discards first and comes ahead of you for every claim.
// (In tournaments, counting every player the same did about as well.)
const UPSTREAM_CONTEST = 1;
const OTHER_CONTEST = 0.5;

// A card's place or places in a run: an ace can be low or high.
const runPlaces = (card: Card): number[] => (card.value === 1) ? [1, 14] : [card.value];
// The same card whether an ace is low or high
const cardKey = (value: number, suit: string): string => ((value === 14) ? 1 : value) + suit;

export const readClues = (view: GameView, memory: Memory): Clues => {
    let {S, R} = view.requirement;
    let setShare = S / (S + R);
    let runShare = R / (S + R);
    let seats = view.seats.length;
    // evidence that each seat collects each value (for sets) and each card (for runs)
    let values = view.seats.map(() => new Map<number, number>());
    let wanted = view.seats.map(() => new Map<string, number>());
    let add = <K>(map: Map<K, number>, key: K, amount: number) => map.set(key, (map.get(key) ?? 0) + amount);

    const note = (seat: number, card: Card, weight: number): void => {
        // wild aces are no clue: everyone wants them
        if (seat === view.seat || isRedAce(card)) return;
        add(values[seat], card.value, weight * setShare);
        for (let place of runPlaces(card)) {
            for (let distance of [1, 2]) {
                for (let value of [place - distance, place + distance]) {
                    if (value >= 1 && value <= 14) add(wanted[seat], cardKey(value, card.suit), weight * NEAR[distance] * runShare);
                }
            }
        }
    };

    // turns since each entry: one per discard after it
    let log = view.log;
    let discardsAfter = new Array<number>(log.length);
    for (let i = log.length - 1, count = 0; i >= 0; i--) {
        discardsAfter[i] = count;
        if (log[i].type === "discard") count++;
    }

    // the discard on offer
    let offered: Card | null = null;
    for (let [i, entry] of log.entries()) {
        let seen = remembers(memory, view.round, i, discardsAfter[i]);
        if (entry.type === "discard") {
            if (seen) note(entry.seat, entry.card, THREW);
            offered = entry.card;
        } else if (entry.type === "claim" || (entry.type === "draw" && entry.from === "discard")) {
            if (seen) note(entry.seat, entry.card, TOOK);
            offered = null;
        } else if (entry.type === "draw" && offered) {
            // drew from the deck rather than take the discard
            if (seen) note(entry.seat, offered, PASSED);
        }
    }

    let tables = view.seats.map(seat => seat.table);
    let fitsTable = (card: Card): boolean => tables.some(table => table.some(setrun => addToSetrun(setrun, card).valid));
    let clamp = (amount: number): number => Math.min(1, Math.max(0, amount));

    const wants = (seat: number, card: Card): number => {
        if (isRedAce(card)) return 1;
        // someone who's down can add any card that fits a setrun
        if (view.seats[seat].isDown) return fitsTable(card) ? 1 : 0;
        let asSet = values[seat].get(card.value) ?? 0;
        let asRun = Math.max(...runPlaces(card).map(place => wanted[seat].get(cardKey(place, card.suit)) ?? 0));
        return clamp(Math.max(asSet, asRun));
    };

    const danger = (card: Card): number => {
        let next = (view.seat + 1) % seats;
        let safe = 1;
        for (let seat = 0; seat < seats; seat++) {
            if (seat === view.seat) continue;
            safe *= 1 - wants(seat, card) * ((seat === next) ? NEXT_REACH : OTHER_REACH);
        }
        return 1 - safe;
    };

    // Copies out of reach, by card: everything on the tables, and what it
    // remembers being discarded since the last reshuffle or taken by someone
    // else. Not the cards in its hand, nor the discard on top, which it can still get.
    let goneIds = new Map<string, string>();
    for (let table of tables) {
        for (let setrun of table) {
            for (let card of setrun.cards) {
                let real = isWild(card) ? card.ace! : card;
                goneIds.set(card.id, cardKey(real.value, real.suit));
            }
        }
    }
    let reshuffled = log.findLastIndex(entry => entry.type === "reshuffle");
    for (let [i, entry] of log.entries()) {
        if (!remembers(memory, view.round, i, discardsAfter[i])) continue;
        let card: Card | null = null;
        if (entry.type === "discard" && i > reshuffled) card = entry.card;
        if ((entry.type === "claim" || (entry.type === "draw" && entry.from === "discard")) && entry.seat !== view.seat) card = entry.card;
        if (card) goneIds.set(card.id, cardKey(card.value, card.suit));
    }
    for (let card of [...view.hand, ...view.discard.slice(0, 1)]) goneIds.delete(card.id);
    let goneCount = new Map<string, number>();
    for (let key of goneIds.values()) add(goneCount, key, 1);
    let mine = new Map<string, number>();
    for (let card of view.hand) add(mine, cardKey(card.value, card.suit), 1);

    const gone = (value: number, suit: Suit): number => goneCount.get(cardKey(value, suit)) ?? 0;
    // copies you could still get, of two in the decks
    const live = (value: number, suit: Suit): number =>
        Math.max(0, 2 - gone(value, suit) - (mine.get(cardKey(value, suit)) ?? 0));

    let upstream = (view.seat - 1 + seats) % seats;
    const contest = (value: number, suit: Suit): number => {
        let card = createCard((value === 14) ? 1 : value, suit, "?");
        let most = 0;
        for (let seat = 0; seat < seats; seat++) {
            if (seat === view.seat) continue;
            most = Math.max(most, wants(seat, card) * ((seat === upstream) ? UPSTREAM_CONTEST : OTHER_CONTEST));
        }
        return most;
    };
    const odds = (value: number, suit: Suit): number => live(value, suit) * (1 - contest(value, suit));

    const outs = (type: SetrunType, cards: Card[]): number => {
        if (type === SET) return SUITS.reduce((sum, suit) => sum + odds(cards[0].value, suit), 0);
        let suit = cards[0].suit;
        let ends = [cards[0].value - 1, cards[cards.length - 1].value + 1].filter(value => value >= 1 && value <= 14);
        return ends.reduce((sum, value) => sum + odds(value, suit), 0);
    };

    return {wants, danger, gone, outs};
};
