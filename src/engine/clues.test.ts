// @vitest-environment node
import {RUN, SET} from './cards.ts';
import {checkSetrun} from './setruns.ts';
import {createGame, type LogEntry} from './game.ts';
import {viewFor} from './view.ts';
import {card, cards} from './testing.ts';
import {readClues, remembers, type Memory} from './clues.ts';

const PERFECT: Memory = {seed : 1, fresh : 1, fade : 1};

// Seat 0's view of a round (0 is 2 sets, 1 is a set and a run, 2 is 2 runs) with this log.
const viewWith = (round: number, log: LogEntry[]) => {
    let state = createGame({names : ["You", "Opponent 1", "Opponent 2", "Opponent 3"], seed : 1});
    state.round = round;
    state.log = log;
    return viewFor(state, 0, 0);
};

const took = (seat: number, str: string, id = str): LogEntry => ({type : "draw", seat, from : "discard", card : card(str, id)});

describe('readClues', () => {
    it('reads a pickup in a round of sets as collecting that value', () => {
        const clues = readClues(viewWith(0, [took(2, "3C")]), PERFECT);
        expect(clues.wants(2, card("3D"))).toBe(1);
        expect(clues.wants(2, card("4C"))).toBe(0);
        // seat 2 can only claim a discard from seat 0, if seat 1 lets it go
        expect(clues.danger(card("3D"))).toBeCloseTo(0.5);
        expect(readClues(viewWith(0, [took(1, "3C")]), PERFECT).danger(card("3D"))).toBe(1);
    });

    it('reads a pickup in a round of runs as wanting its neighbours', () => {
        const clues = readClues(viewWith(2, [took(1, "7D")]), PERFECT);
        expect(cards("6D 8D 5D 9D 7D 7C 10D").map(c => clues.wants(1, c))).toEqual([1, 1, 0.6, 0.6, 0, 0, 0]);
        // an ace can be high
        const kings = readClues(viewWith(2, [took(1, "13S")]), PERFECT);
        expect(kings.wants(1, card("1S"))).toBe(1);
    });

    it('is less sure in a round of sets and runs', () => {
        const clues = readClues(viewWith(1, [took(1, "7D")]), PERFECT);
        expect(clues.wants(1, card("7C"))).toBeCloseTo(0.5);
        expect(clues.wants(1, card("8D"))).toBeCloseTo(0.5);
    });

    it('counts what a seat threw away or passed over against it', () => {
        const threw = readClues(viewWith(0, [took(1, "9C"), {type : "discard", seat : 1, card : card("9S")}]), PERFECT);
        expect(threw.wants(1, card("9D"))).toBeCloseTo(0.3);

        const passed = readClues(viewWith(0, [
            took(1, "5C"),
            {type : "discard", seat : 0, card : card("5H")},
            {type : "draw", seat : 1, from : "deck", card : null}
        ]), PERFECT);
        expect(passed.wants(1, card("5D"))).toBeCloseTo(0.6);
    });

    it("takes any card that fits a table as wanted by someone who's down", () => {
        const view = viewWith(0, []);
        const sevens = checkSetrun(cards("7C 7D 7S"), SET);
        if (!sevens.valid) throw new Error("not a set");
        view.seats[1].isDown = true;
        view.seats[1].table = [sevens.setrun];
        const clues = readClues(view, PERFECT);
        expect(clues.wants(1, card("7H"))).toBe(1);
        expect(clues.wants(1, card("8H"))).toBe(0);
        expect(clues.wants(2, card("7H"))).toBe(0);
    });

    it('ignores wild aces, which everyone wants', () => {
        const clues = readClues(viewWith(0, [took(1, "1H")]), PERFECT);
        expect(clues.wants(1, card("1C"))).toBe(0);
        expect(clues.wants(2, card("1D"))).toBe(1);
    });

    it("forgets what it doesn't remember", () => {
        const clues = readClues(viewWith(0, [took(1, "3C")]), {seed : 1, fresh : 0, fade : 1});
        expect(clues.wants(1, card("3D"))).toBe(0);
    });
});

describe('counting cards', () => {
    const threw = (seat: number, str: string, id = str): LogEntry => ({type : "discard", seat, card : card(str, id)});

    it('counts cards on the tables, and a wild ace as the ace it is', () => {
        const view = viewWith(2, []);
        const run = checkSetrun(cards("4S 5S 1H 7S"), RUN);
        if (!run.valid) throw new Error("not a run");
        view.seats[1].table = [run.setrun];
        view.seats[1].isDown = true;
        const clues = readClues(view, PERFECT);
        expect(clues.gone(5, "S")).toBe(1);
        expect(clues.gone(6, "S")).toBe(0);
        expect(clues.gone(1, "H")).toBe(1);
    });

    it("counts what it saw discarded or taken by others, but not its own hand or the discard on top", () => {
        const view = viewWith(2, [threw(1, "9C", "a"), took(2, "9C", "a"), threw(2, "9C", "b"), threw(3, "4D", "c"), took(0, "4D", "c"), threw(0, "8H", "d")]);
        view.hand = [card("4D", "c")];
        view.discard = [card("8H", "d")];
        const clues = readClues(view, PERFECT);
        expect(clues.gone(9, "C")).toBe(2);
        expect(clues.gone(4, "D")).toBe(0);
        expect(clues.gone(8, "H")).toBe(0);
    });

    it('forgets discards once the pile is shuffled back into the deck', () => {
        const view = viewWith(2, [threw(1, "9C"), {type : "reshuffle", seat : 2}]);
        expect(readClues(view, PERFECT).gone(9, "C")).toBe(0);
    });
});

describe('outs', () => {
    it('counts the cards still to be had that would grow a setrun', () => {
        const view = viewWith(2, []);
        view.hand = cards("5S 6S 7S 7C 7D");
        view.discard = [];
        const clues = readClues(view, PERFECT);
        // two each of the 4♠ and 8♠
        expect(clues.outs(RUN, cards("5S 6S 7S"))).toBe(4);
        // two of every 7, less the three in hand (the 7♠ too)
        expect(clues.outs(SET, cards("7C 7D"))).toBe(5);
    });

    it('discounts cards others want, the player before you most', () => {
        const outsWhen = (seat: number) => {
            const view = viewWith(2, [took(seat, "3S")]);
            view.hand = cards("5S 6S 7S");
            view.discard = [];
            return readClues(view, PERFECT).outs(RUN, cards("5S 6S 7S"));
        };
        // seat 3 plays just before seat 0, and wants the 4♠
        expect(outsWhen(3)).toBe(2);
        expect(outsWhen(1)).toBe(3);
    });
});

describe('remembers', () => {
    const memory: Memory = {seed : 7, fresh : 0.95, fade : 0.92};

    it('decides the same way every time', () => {
        for (let index = 0; index < 20; index++) {
            expect(remembers(memory, 3, index, 4)).toBe(remembers(memory, 3, index, 4));
        }
    });

    it('forgets more as turns go by, and never remembers again', () => {
        const remembered = (age: number) => Array.from({length : 200}, (_, index) => remembers(memory, 0, index, age));
        const counts = [0, 5, 10, 20].map(age => remembered(age).filter(Boolean).length);
        expect(counts).toEqual(counts.toSorted((a, b) => b - a));
        expect(counts[0]).toBeGreaterThan(170);
        expect(counts[3]).toBeLessThan(60);
        for (let age = 0; age < 30; age++) {
            const now = remembered(age);
            remembered(age + 1).forEach((later, index) => {
                if (later) expect(now[index]).toBe(true);
            });
        }
    });

    it('remembers everything with perfect memory', () => {
        expect(Array.from({length : 50}, (_, index) => remembers(PERFECT, 0, index, 40)).every(Boolean)).toBe(true);
    });
});
