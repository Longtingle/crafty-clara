// @vitest-environment node
import {RUN} from './cards.ts';
import {CAST, type CharacterId} from './cast.ts';
import {createGame, type GameState} from './game.ts';
import {LINES, type Moment} from './lines.ts';
import {checkSetrun} from './setruns.ts';
import {answer, claim, createTalker, feel, talkAbout, type Heard, type Line} from './talk.ts';
import {cards} from './testing.ts';
import {viewFor} from './view.ts';

// you, and three of the cast
const NAMES = ["You", "Clara", "Alan", "Gemma"];
const WHO: CharacterId[] = ["clara", "alan", "gemma"];

// round 1 dealt, while everyone looks over their hand: you start, so Gemma dealt
const dealt = (seed: number): GameState => createGame({names : NAMES, seed, lookMs : 30_000});

const readable = (line: Line) => {
    expect(line.text).not.toMatch(/[{}]/);
    expect(line.text).not.toMatch(/\bYou\b/);
};

describe('the lines', () => {
    it('only use a name to address someone, so it can be left out', () => {
        for (let [who, moments] of Object.entries(LINES)) {
            for (let [moment, lines] of Object.entries(moments)) {
                for (let written of lines) {
                    for (let text of (typeof written === "string") ? [written] : [written.text, ...written.replies]) {
                        let bare = text
                            .replace(/(^|[.!?] )\{(?:name|dealer)\}, /g, "$1")
                            .replace(/, \{(?:name|dealer)\}(?=[.!?,])/g, "");
                        expect(bare, who + " " + moment + ": " + text).not.toMatch(/\{(?:name|dealer)\}/);
                        expect(text, who + " " + moment + ": " + text).not.toMatch(/\{(?!name\}|dealer\}|card\})/);
                    }
                }
            }
        }
    });

    it('give everyone something to say at every moment', () => {
        const everyone: Moment[] = [
            "dealBlame", "dealer", "handCoy", "doubt", "downSelf", "downOther", "downBig", "comeback", "claimSelf", "claimOther",
            "tookDiscard", "addedToMine", "redAce", "reshuffle", "outSelf", "outOther", "caught", "deckOut", "wonGame", "lostGame"
        ];
        for (let {id, honesty} of CAST) {
            for (let moment of everyone) expect(LINES[id][moment]?.length, id + " " + moment).toBeGreaterThan(0);
            // who gives nothing away has nothing to say about their hand
            for (let moment of ["dealGood", "dealBad", "handGood", "handBad"] as Moment[]) {
                let count = LINES[id][moment]?.length ?? 0;
                if (honesty === "closed") expect(count, id + " " + moment).toBe(0);
                else expect(count, id + " " + moment).toBeGreaterThan(0);
            }
            // nobody groans at their own puns
            let groans = LINES[id].groan?.length ?? 0;
            if (id === "chris") expect(groans).toBe(0);
            else expect(groans, id + " groan").toBeGreaterThan(0);
        }
    });
});

describe('how a character talks about their hand', () => {
    // in round 1 (two sets), a hand ready to go down, and one nowhere near
    const READY = cards("5C 5S 5D 9H 9C 9S 2H 4D 7C 11S 13H 3S");
    const HOPELESS = cards("2C 4S 6D 8H 10C 12S 3H 5D 7S 9D 11C 13S");

    it('knows how its hand really stands', () => {
        const state = dealt(1);
        state.seats[1].hand = READY;
        expect(feel(viewFor(state, 1, 0))).toBe("good");
        state.seats[1].hand = HOPELESS;
        expect(feel(viewFor(state, 1, 0))).toBe("bad");
    });

    it('tells the truth, bluffs or boasts, as their character goes', () => {
        const share = (who: CharacterId, truth: "good" | "bad", said: "good" | "bad" | "coy") => {
            const talker = createTalker(who, 1);
            return Array.from({length : 1000}, () => claim(talker, truth)).filter(answer => answer === said).length / 1000;
        };
        // honest: a grumble means a bad hand
        expect(share("alan", "bad", "bad")).toBeGreaterThan(0.85);
        expect(share("alan", "bad", "good")).toBe(0);
        // a bluffer moans most when nearly down
        expect(share("clara", "good", "bad")).toBeGreaterThan(0.7);
        // a boaster boasts, whatever the hand
        expect(share("steve", "bad", "good")).toBeGreaterThan(0.6);
        // and some give nothing away
        expect(share("vena", "good", "coy")).toBe(1);
    });
});

describe('talking about the game', () => {
    it('has one of the table, at most, say something as the cards are dealt', () => {
        let spoken = 0;
        for (let seed = 1; seed <= 40; seed++) {
            const state = dealt(seed);
            const said = [1, 2, 3].map(seat => talkAbout(null, viewFor(state, seat, 0), createTalker(WHO[seat - 1], seed)));
            expect(said.filter(Boolean).length).toBeLessThanOrEqual(1);
            spoken += said.filter(Boolean).length;
            // and nothing more until something happens
            const view = viewFor(state, 1, 0);
            expect(talkAbout(view, view, createTalker("clara", seed))).toBeNull();
        }
        expect(spoken).toBeGreaterThan(10);
    });

    it('blames the dealer, who answers back', () => {
        for (let seed = 1; seed < 400; seed++) {
            const state = dealt(seed);
            for (let seat of [1, 2]) {
                const line = talkAbout(null, viewFor(state, seat, 0), createTalker("alan", seed));
                if (!line?.id.startsWith("alan.dealBlame.")) continue;
                expect(line).toMatchObject({to : 3, invites : "dealer"});
                readable(line);

                // Gemma dealt, and nearly always says something back, by name
                const heard: Heard = {seat, line, round : 0, after : 0};
                const replies = Array.from({length : 20}, (_, i) => answer(heard, viewFor(state, 3, 0), createTalker("gemma", i)));
                expect(replies.filter(Boolean).length).toBeGreaterThan(10);
                for (let reply of replies.filter(reply => reply !== null)) {
                    expect(reply.id).toMatch(/^gemma\.dealer\./);
                    expect(reply.to).toBe(seat);
                    // an answer asks for none
                    expect(reply.invites).toBeUndefined();
                    readable(reply);
                }
                // nobody else answers
                expect(answer(heard, viewFor(state, 1 + 2 - seat, 0), createTalker("clara", 1))).toBeNull();
                return;
            }
        }
        throw new Error("nobody blamed the dealer");
    });

    it('leaves your name out of a line said to you', () => {
        let lines: Line[] = [];
        for (let seed = 1; seed < 400 && lines.length < 3; seed++) {
            const state = dealt(seed);
            // Clara starts, so you dealt
            state.turn = 1;
            for (let seat of [2, 3]) {
                const line = talkAbout(null, viewFor(state, seat, 0), createTalker("clara", seed));
                if (line?.id.startsWith("clara.dealBlame.")) lines.push(line);
            }
        }
        expect(lines.length).toBeGreaterThan(0);
        for (let line of lines) {
            expect(line.to).toBe(0);
            readable(line);
            expect(line.text[0]).toBe(line.text[0].toUpperCase());
        }
    });

    it('has one of the others ooh at a long run going down, said to whoever went down', () => {
        const run = checkSetrun(cards("3H 4H 5H 6H 7H 8H 9H"), RUN);
        if (!run.valid) throw new Error("not a run");
        for (let seed = 1; seed < 50; seed++) {
            const before = dealt(seed);
            before.phase = "play";
            before.look = null;
            const after = structuredClone(before);
            after.seats[0].isDown = true;
            after.seats[0].table = [run.setrun];
            after.log = [{type : "goDown", seat : 0}];
            const said = [1, 2, 3].map(seat => talkAbout(viewFor(before, seat, 0), viewFor(after, seat, 0), createTalker(WHO[seat - 1], seed)));
            const lines = said.filter(line => line !== null);
            expect(lines.length).toBeLessThanOrEqual(1);
            if (lines.length === 0) continue;
            expect(lines[0]).toMatchObject({to : 0, big : true, invites : "comeback"});
            expect(lines[0].id).toMatch(/\.downBig\./);
            readable(lines[0]);
            return;
        }
        throw new Error("nobody oohed");
    });
});

describe('answering', () => {
    it('gives the answer written for a line, from one of the others', () => {
        const state = dealt(2);
        const line: Line = {id : "alan.handBad.3", text : "That's it, I'm capitulating.", invites : "doubt", replies : ["Well, if you do, you'll clean it up."]};
        let answered = 0;
        for (let after = 0; after < 40; after++) {
            const answers = [1, 3]
                .map(seat => answer({seat : 2, line, round : 0, after}, viewFor(state, seat, 0), createTalker(WHO[seat - 1], after)))
                .filter(reply => reply !== null);
            expect(answers.length).toBeLessThanOrEqual(1);
            for (let reply of answers) {
                expect(reply).toMatchObject({text : "Well, if you do, you'll clean it up.", to : 2});
                expect(reply.invites).toBeUndefined();
                answered++;
            }
        }
        expect(answered).toBeGreaterThan(5);
    });

    it("doesn't say a line again while it has others, nor one heard in a recent game", () => {
        const state = dealt(1);
        const blame: Line = {id : "clara.dealBlame.0", text : "Who dealt this?", to : 3, invites : "dealer"};
        const answers = (talker: ReturnType<typeof createTalker>) => Array.from({length : 30}, (_, after) => answer({seat : 1, line : blame, round : 0, after}, viewFor(state, 3, 0), talker))
            .filter(reply => reply !== null)
            .map(reply => reply.id);
        // Julie has two answers for blaming the dealer: both, then the one said longest ago
        const said = answers(createTalker("julie", 1));
        expect(said.slice(0, 2).toSorted()).toEqual(["julie.dealer.0", "julie.dealer.1"]);
        expect(said.slice(2, 6)).toEqual([said[0], said[1], said[0], said[1]]);
        expect(answers(createTalker("julie", 1, ["julie.dealer.1", "julie.dealer.0"])).slice(0, 2)).toEqual(["julie.dealer.1", "julie.dealer.0"]);
    });

    it("has one of the others groan at Chris's puns", () => {
        const state = createGame({names : ["You", "Chris", "Alan", "Gemma"], seed : 1});
        const pun: Line = {id : "chris.reshuffle.0", text : "Shuffle off this mortal coil.", invites : "groan"};
        const groans = Array.from({length : 60}, (_, after) => [2, 3]
            .map(seat => answer({seat : 1, line : pun, round : 0, after}, viewFor(state, seat, 0), createTalker((seat === 2) ? "alan" : "gemma", after)))
            .filter(reply => reply !== null)).flat();
        expect(groans.length).toBeGreaterThan(5);
        expect(groans.every(reply => /\.groan\./.test(reply.id) && reply.text.includes("Chris"))).toBe(true);
    });
});
