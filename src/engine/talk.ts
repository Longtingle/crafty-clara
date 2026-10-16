// What the cast say at the table, and when. A bot talks from its own view,
// as it plays from it, so it never says what it couldn't know: it talks about
// its own hand (truly or not, as its character goes), and about what everyone
// can see. The lines themselves are in lines.ts, and a bot says one by its id
// in the catalogue (catalogue.ts).
//
// Every bot sees the same log, so they agree without a word between them on
// who reacts to each move (chosen): one of the others, or nobody, when the
// lot falls on a person. A line can ask for an answer: the dealer's, when
// blamed for the deal; a comeback, from whoever a remark was made to; or
// doubt, or a groan at a pun, from one of the others.

import {SET, isRedAce, type Card} from './cards.ts';
import {shortName} from './card-names.ts';
import {character, type CharacterId} from './cast.ts';
import {planGoDown, scoreHand} from './bot.ts';
import {lineEntry, linesFor, meaning, type Entry, type Line} from './catalogue.ts';
import type {LogEntry} from './game.ts';
import type {Moment} from './lines.ts';
import {random, type Seeded} from './random.ts';
import type {GameView} from './view.ts';

/** A line as the table hears it: who said it, and when, by the round's log. */
export interface Heard {
    seat: number;
    line: Line;
    round: number;
    /** how many of the round's log entries came before it */
    after: number;
}

/** A bot's voice: who it is, what it draws on to choose, and the lines heard lately. */
export interface Talker {
    character: CharacterId;
    seeded: Seeded;
    /**
     * Lines said this game, or in games lately, and when, by a count that
     * goes up. It keeps off them while it has others, and then says the one
     * said longest ago.
     */
    used: Map<string, number>;
    count: number;
}

/** recent: lines heard in games lately, oldest first. */
export const createTalker = (id: CharacterId, seed: number, recent: string[] = []): Talker => ({
    character : id,
    seeded : {rng : seed ^ 0x5EED7A1C},
    used : new Map(recent.map((line, index) => [line, index - recent.length])),
    count : 0
});

/** Remembers a line said at the table, so the bot doesn't say it again soon. */
export const hear = (talker: Talker, line: Line): void => {
    talker.used.set(line.id, ++talker.count);
};

/** A seat's own points, this round, that count as being caught. */
const CAUGHT = 50;

const chance = (talker: Talker, p: number): boolean => random(talker.seeded) < p;

// A whole number from a string, the same everywhere.
const hashString = (text: string): number => {
    let h = 0x811C9DC5;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
    return h;
};

// One of the seats, except some: the same for every bot that asks about the
// same thing (key), and different from one game to the next. So the bots
// agree on who reacts to something. The game's part comes from its cards'
// ids, which all start with the game's own prefix ("k3f9-17").
const chosen = (view: GameView, key: number, except: number[]): number | null => {
    let seats = view.seats.map((_, seat) => seat).filter(seat => !except.includes(seat));
    if (seats.length === 0) return null;
    let id = view.deck.top ?? view.discard[0]?.id ?? "";
    let h = Math.imul((key + hashString(id.slice(0, id.lastIndexOf("-") + 1))) ^ 0x9E3779B9, 0x85EBCA6B);
    h ^= h >>> 13;
    h = Math.imul(h, 0xC2B2AE35);
    h ^= h >>> 16;
    return seats[(h >>> 0) % seats.length];
};

// How the bot's hand really stands: ready (or nearly) to go down, a long way
// off, or in between.
export const feel = (view: GameView): "good" | "bad" | "middling" => {
    let {hand, requirement} = view;
    if (planGoDown(hand, requirement, view.seats.map(seat => seat.table))) return "good";
    let need = 3 * requirement.S + 4 * requirement.R;
    let have = scoreHand(hand, requirement).bestHand
        .reduce((sum, candidate) => sum + Math.min(candidate.cards.length, (candidate.type === SET) ? 3 : 4), 0);
    let share = have / need;
    return (share >= 0.75) ? "good" : (share <= 0.5) ? "bad" : "middling";
};

// What the bot says its hand is like, as its character goes.
export const claim = (talker: Talker, truth: "good" | "bad" | "middling"): "good" | "bad" | "coy" => {
    let r = random(talker.seeded);
    let flip: "good" | "bad" = (truth === "good") ? "bad" : "good";
    switch (character(talker.character).honesty) {
        case "closed":
            return "coy";
        case "honest":
            return (truth === "middling" || r >= 0.9) ? "coy" : truth;
        case "mostly":
            return (truth === "middling") ? "coy" : ((r < 0.75) ? truth : flip);
        case "bluffs":
            // moans most when nearly down
            if (truth === "good") return (r < 0.8) ? "bad" : ((r < 0.9) ? "good" : "coy");
            return (r < 0.5) ? "bad" : ((r < 0.7) ? "good" : "coy");
        case "boasts":
            if (truth === "bad") return (r < 0.7) ? "good" : ((r < 0.9) ? "bad" : "coy");
            return (r < 0.9) ? "good" : "coy";
        case "random":
            return (r < 0.5) ? "good" : "bad";
    }
};

interface Saying {
    to?: number;
    card?: Card;
    /** the line it answers */
    answering?: Line;
}

// One of the character's lines for the moment: one not heard lately, if it
// has any, or else the one heard longest ago.
const say = (talker: Talker, moment: Moment, saying: Saying = {}): Line | null => {
    let lines = linesFor(talker.character, moment);
    if (lines.length === 0) return null;
    let fresh = lines.filter(line => !talker.used.has(line.id));
    let entry = (fresh.length > 0)
        ? fresh[Math.floor(random(talker.seeded) * fresh.length)]
        : lines.reduce((oldest, line) => (talker.used.get(line.id)! < talker.used.get(oldest.id)!) ? line : oldest);
    return speak(talker, entry, saying);
};

const speak = (talker: Talker, entry: Entry, {to, card, answering}: Saying): Line => {
    talker.used.set(entry.id, ++talker.count);
    let line: Line = {id : entry.id};
    if (to !== undefined) line.to = to;
    if (card) line.card = shortName(card);
    if (answering) line.re = answering.id;
    return line;
};

// Talk about its own hand, as its character goes. Giving nothing away is
// what some characters do; for the rest it's often not worth saying.
const aboutMyHand = (view: GameView, talker: Talker, dealt: boolean): Line | null => {
    let said = claim(talker, feel(view));
    if (said === "coy") {
        let closed = character(talker.character).honesty === "closed";
        return (closed || chance(talker, 0.4)) ? say(talker, "handCoy") : null;
    }
    if (dealt) return say(talker, (said === "good") ? "dealGood" : "dealBad");
    return say(talker, (said === "good") ? "handGood" : "handBad");
};

// As the cards are dealt, one of the table says something: about their hand,
// or blaming the dealer (whoever plays just before the one who starts).
const aboutTheDeal = (view: GameView, talker: Talker): Line | null => {
    let count = view.seats.length;
    let dealer = (view.turn - 1 + count) % count;
    if (chosen(view, view.round * 7919 + 1, []) !== view.seat || !chance(talker, 0.8)) return null;
    if (dealer !== view.seat && chance(talker, 0.45)) return say(talker, "dealBlame", {to : dealer});
    return aboutMyHand(view, talker, true);
};

// The end of a round, or of the game: the winner crows, someone else grumbles.
const aboutTheEnd = (view: GameView, out: number | null, key: number, talker: Talker): Line | null => {
    let me = view.seat;
    if (view.phase === "gameEnd") {
        let totals = view.seats.map(seat => seat.total);
        let winner = totals.indexOf(Math.min(...totals));
        if (winner === me) return chance(talker, 0.9) ? say(talker, "wonGame") : null;
        if (chosen(view, key, [winner]) !== me) return null;
        return chance(talker, 0.6) ? say(talker, "lostGame") : null;
    }
    if (out === me) return chance(talker, 0.9) ? say(talker, "outSelf") : null;
    if (chosen(view, key, (out === null) ? [] : [out]) !== me) return null;
    if (out === null) return chance(talker, 0.6) ? say(talker, "deckOut") : null;
    if ((view.seats[me].scores.at(-1) ?? 0) >= CAUGHT) return chance(talker, 0.85) ? say(talker, "caught") : null;
    return chance(talker, 0.7) ? say(talker, "outOther", {to : out}) : null;
};

// What the bot says about one move, if anything. index is the move's place
// in the round's log, which every bot agrees on.
const aboutMove = (entry: LogEntry, index: number, view: GameView, talker: Talker): Line | null => {
    let me = view.seat;
    let key = view.round * 7919 + index * 31;
    let reacts = (except: number[]): boolean => chosen(view, key, except) === me;
    let mine = entry.seat === me;
    let to = entry.seat;
    switch (entry.type) {
        case "draw":
            if (mine && entry.from === "discard") return chance(talker, 0.25) ? say(talker, "tookDiscard", {card : entry.card}) : null;
            // now and then, as its turn starts, something about its hand
            if (mine) return (!view.seats[me].isDown && chance(talker, 0.15)) ? aboutMyHand(view, talker, false) : null;
            if (entry.from === "discard" && isRedAce(entry.card) && reacts([to])) return chance(talker, 0.5) ? say(talker, "redAce", {to}) : null;
            // waiting on someone else's turn
            return (reacts([to]) && chance(talker, 0.1)) ? say(talker, "idle", {to}) : null;
        case "discard":
            if (mine) return chance(talker, 0.2) ? say(talker, "discardSelf", {card : entry.card}) : null;
            return (reacts([to]) && chance(talker, 0.12)) ? say(talker, "discardOther", {to}) : null;
        case "claim":
            // got it ahead of someone who wanted it too: rub it in
            if (mine && entry.beaten) return chance(talker, 0.85) ? say(talker, "wonClaim", {to : entry.beaten[0]}) : null;
            if (mine) return chance(talker, 0.45) ? say(talker, "claimSelf") : null;
            // wanted it too, and lost
            if (entry.beaten?.includes(me)) return chance(talker, 0.5) ? say(talker, "claimOther", {to}) : null;
            if (!reacts([to])) return null;
            if (isRedAce(entry.card)) return chance(talker, 0.6) ? say(talker, "redAce", {to}) : null;
            return chance(talker, 0.3) ? say(talker, "claimOther", {to}) : null;
        case "goDown": {
            if (mine) return chance(talker, 0.75) ? say(talker, "downSelf") : null;
            if (!reacts([to])) return null;
            let table = view.seats[to].table;
            if (table.some(setrun => setrun.cards.length >= 6)) return chance(talker, 0.9) ? say(talker, "downBig", {to}) : null;
            if (table.some(setrun => setrun.cards.some(isRedAce))) return chance(talker, 0.5) ? say(talker, "redAce", {to}) : null;
            return chance(talker, 0.55) ? say(talker, "downOther", {to}) : null;
        }
        case "add":
            if (mine) return null;
            if (entry.target.seat === me) return chance(talker, 0.5) ? say(talker, "addedToMine", {to}) : null;
            if (isRedAce(entry.card) && reacts([to])) return chance(talker, 0.4) ? say(talker, "redAce", {to}) : null;
            return null;
        case "reshuffle":
            return (reacts([]) && chance(talker, 0.5)) ? say(talker, "reshuffle") : null;
        case "out":
            return aboutTheEnd(view, entry.seat, key, talker);
        case "deckOut":
            return aboutTheEnd(view, null, key, talker);
        default:
            return null;
    }
};

/**
 * What the bot says, if anything, about what's happened since its last view
 * (before): the deal, or a move. At most one line a view.
 */
export const talkAbout = (before: GameView | null, view: GameView, talker: Talker): Line | null => {
    let dealt = view.log.length === 0 && (view.phase === "look" || view.phase === "draw") &&
        (before === null || before.round !== view.round);
    if (dealt) return aboutTheDeal(view, talker);
    if (!before || before.round !== view.round) return null;
    for (let index = before.log.length; index < view.log.length; index++) {
        let line = aboutMove(view.log[index], index, view, talker);
        if (line) return line;
    }
    return null;
};

/** What the bot says back to a line it heard, if anything. */
export const answer = (heard: Heard, view: GameView, talker: Talker): Line | null => {
    let {seat, line} = heard;
    let me = view.seat;
    let {invites, replies} = meaning(line);
    if (seat === me || !invites || heard.round !== view.round) return null;
    let answering = {to : seat, answering : line};
    switch (invites) {
        case "dealer":
            return (line.to === me && chance(talker, 0.85)) ? say(talker, "dealer", answering) : null;
        case "comeback":
            return (line.to === me && chance(talker, 0.45)) ? say(talker, "comeback", answering) : null;
        case "doubt":
        case "groan": {
            if (chosen(view, view.round * 7919 + heard.after * 31 + hashString(line.id), [seat]) !== me) return null;
            // a line with its own answer is a set piece: that's the answer
            if (replies.length > 0) {
                if (!chance(talker, 0.8)) return null;
                let reply = lineEntry(replies[Math.floor(random(talker.seeded) * replies.length)]);
                return reply ? speak(talker, reply, answering) : null;
            }
            return chance(talker, 0.4) ? say(talker, invites, answering) : null;
        }
    }
};
