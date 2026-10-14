import {SET, type Setrun} from '@/engine/cards.ts';
import {shortName} from '@/engine/card-names.ts';
import type {LogEntry} from '@/engine/game.ts';
import type {GameView} from '@/engine/view.ts';
import {seatName, seatColor} from './players.ts';

// What a round's log (view.log) says, from your point of view.

/** A line in the activity panel. */
export interface ActivityEntry {
    id: string;
    name: string;
    color: string;
    text: string;
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

// The log as the activity panel shows it, newest first.
const activityEntries = (view: GameView): ActivityEntry[] => view.log.map((entry, index) => ({
    id : view.round + "-" + index,
    name : seatName(view, entry.seat),
    color : seatColor(view, entry.seat),
    text : describeEntry(entry, view)
})).reverse();

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

// What players say after a move, as [seat, line] pairs. When you add a card
// to an opponent's setrun, they react.
const speechFor = (entry: LogEntry, view: GameView): [number, string][] => {
    switch (entry.type) {
        case "draw": return [[entry.seat, (entry.from === "deck") ? "Picked from deck" : "Picked from discard"]];
        case "claim": return [[entry.seat, "I'll take that!"]];
        case "goDown": return [[entry.seat, "Right, I'm putting my cards down now."]];
        case "discard": return [[entry.seat, "Does anyone want this?"], [(entry.seat + 1) % view.seats.length, "...thinking..."]];
        case "add": return (entry.seat === view.seat) ? [[entry.target.seat, "Woah, steady there!"]] : [];
        default: return [];
    }
}

export {describeEntry, activityEntries, lastAction, newCardTag, speechFor};
