// Every line of table talk, by id, for anyone to look up: the bot that says
// it, the host that passes it on, and each seat that shows it. A seat sends a
// line's id, never its words (Line). So the host can check it's a line the
// speaker could say, a line means the same to everyone, and each seat fills
// in the names from where it sits, leaving out its own.
//
// An id is the character, the moment and a short hash of the words
// ("clara.dealBlame.1x9k2fq"), so it stays the same while the lines around it
// change. Changing a line's words makes it a new line.

import {character, type CharacterId} from './cast.ts';
import {LINES, type Invite, type Moment, type Written} from './lines.ts';

/** A line as a seat says it: which, to whom, the card it names, and the line it answers. It's JSON-safe, to send. */
export interface Line {
    id: string;
    /** the seat it's said to */
    to?: number;
    /** the card it names, as "7♦" */
    card?: string;
    /** the line it answers, by id */
    re?: string;
}

/** A line in the catalogue. */
export interface Entry {
    id: string;
    /** whose line it is: null for an answer written for one line in particular, which anyone may give */
    character: CharacterId | null;
    text: string;
    /** said at a big moment, so it shows even when the talk is turned down */
    big: boolean;
    /** the kind of answer it asks for */
    invites: Invite | null;
    /** the answers written for it, by id */
    replies: string[];
}

/** What a line means as said: whether it's big, and the answer it asks for. */
export interface Meaning {
    big: boolean;
    invites: Invite | null;
    replies: string[];
}

// The moments that show even when the talk is turned down.
const BIG = new Set<Moment>(["downSelf", "downOther", "downBig", "outSelf", "outOther", "caught", "deckOut", "wonGame", "lostGame"]);

// What each moment's lines ask for. A character's other lines may ask for
// something of their own (Character.asksFor: Chris's puns get groans).
const INVITES: Partial<Record<Moment, Invite>> = {
    dealBlame : "dealer",
    dealGood : "doubt",
    dealBad : "doubt",
    handGood : "doubt",
    handBad : "doubt",
    handCoy : "doubt",
    downOther : "comeback",
    downBig : "comeback",
    claimOther : "comeback",
    wonClaim : "comeback",
    discardOther : "comeback",
    addedToMine : "comeback",
    redAce : "comeback",
    outOther : "comeback"
};

// a short name for some words, the same everywhere: FNV-1a, in base 36
const hash = (text: string): string => {
    let h = 0x811C9DC5;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
    return (h >>> 0).toString(36);
};

const ENTRIES = new Map<string, Entry>();
const BY_MOMENT = new Map<string, Entry[]>();

const add = (entry: Entry): Entry => {
    if (ENTRIES.has(entry.id)) throw new Error("Two lines have the id " + entry.id + ": " + entry.text);
    ENTRIES.set(entry.id, entry);
    return entry;
};

for (let [who, repertoire] of Object.entries(LINES) as [CharacterId, Partial<Record<Moment, Written[]>>][]) {
    for (let [moment, lines] of Object.entries(repertoire) as [Moment, Written[]][]) {
        BY_MOMENT.set(who + "." + moment, lines.map(written => {
            let text = (typeof written === "string") ? written : written.text;
            let id = who + "." + moment + "." + hash(text);
            let replies = (typeof written === "string") ? [] : written.replies.map(reply =>
                add({id : id + ".re." + hash(reply), character : null, text : reply, big : false, invites : null, replies : []}).id);
            let invites = INVITES[moment] ?? character(who).asksFor ?? null;
            return add({id, character : who, text, big : BIG.has(moment), invites, replies});
        }));
    }
}

/** The line with this id, if there is one. */
export const lineEntry = (id: string): Entry | undefined => ENTRIES.get(id);

/** A character's lines for a moment. */
export const linesFor = (who: CharacterId, moment: Moment): Entry[] => BY_MOMENT.get(who + "." + moment) ?? [];

/**
 * What a line means as said. An answer is as big as the line it answers, so
 * an answer to a big moment shows too, and it asks for no answer itself.
 */
export const meaning = (line: Line): Meaning => {
    let entry = ENTRIES.get(line.id);
    if (!entry) return {big : false, invites : null, replies : []};
    if (line.re === undefined) return {big : entry.big, invites : entry.invites, replies : entry.replies};
    return {big : entry.big || (ENTRIES.get(line.re)?.big ?? false), invites : null, replies : []};
};

/**
 * A line's words, as one seat hears it: `nameOf` gives the name of the seat
 * it's said to, or null for the seat hearing it. A name is only ever used to
 * address someone (lines.ts), so a line said to you leaves yours out: "Get
 * you, {name}." becomes "Get you.", and "{dealer}, did you shuffle?" "Did you
 * shuffle?".
 */
export const lineText = (line: Line, nameOf: (seat: number) => string | null): string => {
    let text = ENTRIES.get(line.id)?.text ?? "";
    if (line.card !== undefined) text = text.replaceAll("{card}", line.card);
    let name = (line.to === undefined) ? null : nameOf(line.to);
    if (name !== null) return text.replace(/\{(?:name|dealer)\}/g, name);
    return text
        .replace(/, \{(?:name|dealer)\}/g, "")
        .replace(/(^|[.!?] )\{(?:name|dealer)\}, (.)/g, (_, before: string, first: string) => before + first.toUpperCase());
};

// "7♦", "A♥", "10♣": a card's short name (card-names.ts)
const CARD_NAME = /^(?:A|[2-9]|10|J|Q|K)[♣♦♥♠]$/u;

type Fields = Record<string, unknown>;

/**
 * The line a seat says, rebuilt from only the fields a line has, or null if
 * it isn't one the speaker could say: a line of the catalogue, theirs if it's
 * a character's, said to another seat, naming a card by its short name, and
 * answering a line of the catalogue. `speaker` is who sits in that seat.
 */
export const parseLine = (value: unknown, seat: number, seats: number, speaker: CharacterId | null): Line | null => {
    if (typeof value !== "object" || value === null) return null;
    let {id, to, card, re} = value as Fields;
    let entry = (typeof id === "string") ? ENTRIES.get(id) : undefined;
    if (!entry || (entry.character !== null && entry.character !== speaker)) return null;
    let line: Line = {id : entry.id};
    if (to !== undefined) {
        if (!Number.isInteger(to) || (to as number) < 0 || (to as number) >= seats || to === seat) return null;
        line.to = to as number;
    }
    if (card !== undefined) {
        if (typeof card !== "string" || !CARD_NAME.test(card)) return null;
        line.card = card;
    }
    if (re !== undefined) {
        if (typeof re !== "string" || !ENTRIES.has(re)) return null;
        line.re = re;
    }
    return line;
};
