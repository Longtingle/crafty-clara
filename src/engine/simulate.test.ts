// @vitest-environment node
import {ROUND_REQUIREMENTS, type Card} from './cards.ts';
import {checkSetrun} from './setruns.ts';
import type {GameState} from './game.ts';
import {simulateGame, type SimulationOptions} from './simulate.ts';

// Everything that must hold in every state of every game.
const problems = (state: GameState): string[] => {
    let found: string[] = [];
    let all: Card[] = [
        ...state.deck,
        ...state.discard,
        ...state.seats.flatMap(seat => [...seat.hand, ...seat.table.flatMap(setrun => setrun.cards)])
    ];
    if (all.length !== 104) found.push(all.length + " cards in play");
    if (new Set(all.map(card => card.id)).size !== all.length) found.push("two cards share an id");

    let copies = new Map<string, number>();
    for (let card of all) copies.set(card.displayString, (copies.get(card.displayString) ?? 0) + 1);
    if (copies.size !== 52 || [...copies.values()].some(count => count !== 2)) found.push("a card is missing or doubled");

    for (let card of [...state.deck, ...state.discard, ...state.seats.flatMap(seat => seat.hand)]) {
        if (card.displayString !== card.value + card.suit) found.push(card.displayString + " is out of a setrun but not itself");
    }
    state.seats.forEach((seat, index) => {
        if (seat.isDown !== (seat.table.length > 0)) found.push("seat " + index + " isDown doesn't match its table");
        for (let setrun of seat.table) {
            if (!checkSetrun(setrun.cards, setrun.type).valid) {
                found.push("seat " + index + " has an invalid " + setrun.type + ": " + setrun.cards.map(card => card.displayString).join(" "));
            }
        }
        let played = state.round + (state.phase === "roundEnd" || state.phase === "gameEnd" ? 1 : 0);
        if (seat.scores.length !== played) found.push("seat " + index + " has " + seat.scores.length + " scores");
    });
    if (state.claim && state.claim.card !== state.discard[0]?.id) found.push("the claim window offers a card that isn't on top");
    if (state.claim && state.phase !== "play") found.push("a claim window is open in the " + state.phase + " phase");
    return found;
};

const play = (seed: number, options: SimulationOptions = {}) => {
    let found = new Set<string>();
    let result = simulateGame(seed, {...options, onState : state => problems(state).forEach(problem => found.add(problem))});
    return {...result, problems : [...found]};
};

// whole games take a few seconds, near Vitest's default timeout
describe('bot games', {timeout : 30_000}, () => {
    it('play out to the end with the rules holding at every step', () => {
        for (let seed = 1; seed <= 40; seed++) {
            const game = play(seed);
            expect({seed, problems : game.problems, stalled : game.stalled}).toEqual({seed, problems : [], stalled : false});
            expect(game.state.phase).toBe("gameEnd");
            expect(game.turns).toHaveLength(ROUND_REQUIREMENTS.length);
            for (let seat of game.state.seats) expect(seat.scores).toHaveLength(ROUND_REQUIREMENTS.length);
            // someone went out each round, scoring nothing
            expect(game.state.seats.some(seat => seat.scores.at(-1) === 0)).toBe(true);
        }
    });

    it('replay exactly from the same seed', () => {
        expect(simulateGame(99)).toEqual(simulateGame(99));
        expect(simulateGame(99).state).not.toEqual(simulateGame(100).state);
    });

    it('close claim windows at their deadline when a player never answers', () => {
        for (let seed = 1; seed <= 10; seed++) {
            const game = play(seed, {silent : [0, 2]});
            expect({seed, problems : game.problems, stalled : game.stalled}).toEqual({seed, problems : [], stalled : false});
        }
    });

    it('work for 2 to 6 players', () => {
        for (let seats of [2, 3, 5, 6]) {
            const game = play(seats, {seats});
            expect({seats, problems : game.problems, stalled : game.stalled}).toEqual({seats, problems : [], stalled : false});
            expect(game.state.phase).toBe("gameEnd");
        }
    });
});
