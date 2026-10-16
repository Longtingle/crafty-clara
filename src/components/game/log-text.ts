import {SET, type Card, type Setrun} from '@/engine/cards.ts';
import {shortName} from '@/engine/card-names.ts';
import type {LogEntry} from '@/engine/game.ts';
import type {GameView} from '@/engine/view.ts';
import type {Talk} from '@/client/game-client.ts';
import {seatName, seatColor} from './players.ts';

// What a round's log (view.log) says, from your point of view.

/** A line in the activity panel. */
export interface ActivityEntry {
    id: string;
    name: string;
    color: string;
    text: string;
    /** something they said, in quotes */
    quote?: boolean;
}

/** The card your last move brought into your hand, and its tag. */
export interface NewCard {
    id: string;
    label: "New" | "Claimed" | "Back";
}

type AddEntry = Extract<LogEntry, {type: "add"}>;

const kind = (setrun: Setrun): string => (setrun.type === SET) ? "set" : "run";

// Whose setrun a card went onto.
const owner = (view: GameView, entry: AddEntry): string => {
    if (entry.target.seat === view.seat) return "your";
    if (entry.target.seat === entry.seat) return "their";
    return view.seats[entry.target.seat].name + "'s";
}

// What a player did, to follow their name: "drew from the deck".
const describeEntry = (entry: LogEntry, view: GameView): string => {
    switch (entry.type) {
        case "draw":
            if (entry.from === "discard") return "took " + shortName(entry.card) + " from the discard pile";
            return entry.card ? "drew " + shortName(entry.card) + " from the deck" : "drew from the deck";
        case "claim":
            return "claimed " + shortName(entry.card) + " out of turn";
        case "discard":
            return "discarded " + shortName(entry.card);
        case "goDown":
            return "went down";
        case "add": {
            let setrun = view.seats[entry.target.seat].table[entry.target.index];
            let text = "added " + shortName(entry.card) + " to " + owner(view, entry) + " " + kind(setrun);
            return entry.returnedAce ? text + " and took back the wild " + shortName(entry.returnedAce) : text;
        }
        case "reshuffle":
            return "shuffled the discard pile into a new deck";
        case "out":
            return "went out";
        case "deckOut":
            return "ended the round, as the deck had run out for the last time";
    }
}

// The log as the activity panel shows it, newest first, with what's been said
// this round (talk) among the moves, where it was said.
const activityEntries = (view: GameView, talk: Talk[] = []): ActivityEntry[] => {
    let said = talk.filter(line => line.round === view.round);
    let saying = (line: Talk): ActivityEntry => ({
        id : "said-" + line.seq,
        name : seatName(view, line.seat),
        color : seatColor(view, line.seat),
        text : "“" + line.line.text + "”",
        quote : true
    });
    let entries = view.log.flatMap((entry, index) => [...said.filter(line => line.after === index).map(saying), {
        id : view.round + "-" + index,
        name : seatName(view, entry.seat),
        color : seatColor(view, entry.seat),
        text : describeEntry(entry, view)
    }]);
    return [...entries, ...said.filter(line => line.after >= view.log.length).map(saying)].reverse();
};

// The latest thing a player did this round, or null.
const lastAction = (view: GameView, seat: number): string | null => {
    let entry = view.log.findLast(entry => entry.seat === seat);
    return entry ? describeEntry(entry, view) : null;
}

// The card your last move brought into your hand: "New" for a draw,
// "Claimed" for a claim, "Back" for a wild ace given back. Your discard
// clears it.
const newCardTag = (view: GameView): NewCard | null => {
    for (let entry of view.log.toReversed()) {
        if (entry.seat !== view.seat) continue;
        if (entry.type === "discard") return null;
        if (entry.type === "draw") return entry.card && {id : entry.card.id, label : "New"};
        if (entry.type === "claim") return {id : entry.card.id, label : "Claimed"};
        if (entry.type === "add" && entry.returnedAce) return {id : entry.returnedAce.id, label : "Back"};
    }
    return null;
}

// When someone ahead of you in line claimed a discard you asked for too: who,
// and the card. Null for any other move.
const lostClaim = (entry: LogEntry, view: GameView): string | null => {
    if (entry.type !== "claim" || !entry.beaten?.includes(view.seat)) return null;
    return seatName(view, entry.seat) + " was ahead of you in line, and got the " + shortName(entry.card) + ".";
};

// The cards in a player's hand that everyone knows, by id: taken from the
// discard pile, claimed, or a wild ace they took back, this round.
const knownCards = (view: GameView, seat: number): Record<string, Card> => {
    let known: Record<string, Card> = {};
    for (let entry of view.log) {
        if (entry.seat !== seat) continue;
        if ((entry.type === "draw" && entry.from === "discard") || entry.type === "claim") known[entry.card.id] = entry.card;
        if (entry.type === "add" && entry.returnedAce) known[entry.returnedAce.id] = entry.returnedAce;
    }
    let holding = new Set(view.seats[seat].cards);
    return Object.fromEntries(Object.entries(known).filter(([id]) => holding.has(id)));
};

export {describeEntry, activityEntries, lastAction, newCardTag, knownCards, lostClaim};
