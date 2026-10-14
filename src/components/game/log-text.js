import {SET} from '@/engine/cards.ts';
import {shortName} from '@/engine/card-names.ts';
import {seatName, seatColor} from './players.js';

// What a round's log (view.log) says, from your point of view.

const kind = (setrun) => (setrun?.type === SET) ? "set" : "run";

// Whose setrun a card went onto.
const owner = (view, entry) => {
    if (entry.target.seat === view.seat) return "your";
    if (entry.target.seat === entry.seat) return "their";
    return view.seats[entry.target.seat].name + "'s";
}

// What a player did, to follow their name: "drew from the deck".
const describeEntry = (entry, view) => {
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
        default:
            return "";
    }
}

// The log as the activity panel shows it: newest first, as {id, name, color, text}.
const activityEntries = (view) => view.log.map((entry, index) => ({
    id : view.round + "-" + index,
    name : seatName(view, entry.seat),
    color : seatColor(view, entry.seat),
    text : describeEntry(entry, view)
})).reverse();

// The latest thing a player did this round, or null.
const lastAction = (view, seat) => {
    let entry = view.log.findLast(entry => entry.seat === seat);
    return entry ? describeEntry(entry, view) : null;
}

// The card your last move brought into your hand, tagged {id, label}: "New"
// for a draw, "Claimed" for a claim, "Back" for a wild ace given back. Your
// discard clears it.
const newCardTag = (view) => {
    for (let entry of view.log.toReversed()) {
        if (entry.seat !== view.seat) continue;
        if (entry.type === "discard") return null;
        if (entry.type === "draw") return {id : entry.card.id, label : "New"};
        if (entry.type === "claim") return {id : entry.card.id, label : "Claimed"};
        if (entry.type === "add" && entry.returnedAce) return {id : entry.returnedAce.id, label : "Back"};
    }
    return null;
}

export {describeEntry, activityEntries, lastAction, newCardTag};
