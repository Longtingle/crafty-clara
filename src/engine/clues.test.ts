// @vitest-environment node
import {SET} from './cards.ts';
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

const took = (seat: number, str: string): LogEntry => ({type : "draw", seat, from : "discard", card : card(str)});

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
