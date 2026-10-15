// @vitest-environment node
import {RUN, SET, type Card, type Setrun, type SetrunType} from './cards.ts';
import {checkSetrun} from './setruns.ts';
import {getRuns, getSets, scoreHand, wantsCard, chooseDiscard, planGoDown, findAddition, botMove, NORMAL_BOT as NORMAL, type BotProfile} from './bot.ts';
import {apply, createGame, type GameState} from './game.ts';
import {viewFor} from './view.ts';
import {card, cards, names, values} from './testing.ts';

const setrun = (str: string, type: typeof SET | typeof RUN): Setrun => {
    let result = checkSetrun(cards(str), type);
    if (!result.valid) throw new Error(str + " isn't a valid " + type);
    return result.setrun;
};

describe('getSets', () => {
    it('groups pairs and better by value, best first', () => {
        const result = getSets(cards("2C 9H 2D 9S 9C 5H"));
        expect(result.numFullSets).toBe(1);
        expect(result.sets.map(values)).toEqual([[9, 9, 9], [2, 2]]);
    });
});

describe('getRuns', () => {
    it('finds runs per suit and ignores duplicate cards', () => {
        const result = getRuns(cards("5C 6C 6C 7C 8C 2H 3H"));
        expect(result.numFullRuns).toBe(1);
        expect(names(result.runs[0])).toEqual(["5C", "6C", "7C", "8C"]);
        expect(names(result.runs[1])).toEqual(["2H", "3H"]);
    });

    it('lets an ace follow a king', () => {
        const result = getRuns(cards("11S 12S 13S 1S"));
        expect(values(result.runs[0])).toEqual([11, 12, 13, 14]);
    });
});

describe('scoreHand', () => {
    it('is ready to go down when the requirement is met', () => {
        const hand = cards("7C 7H 7D 2S 2H 2C 9D 13S 4H 5C 11D 12H");
        expect(scoreHand(hand, {S : 2, R : 0}).readyToGoDown).toBe(true);
        expect(scoreHand(hand, {S : 1, R : 1}).readyToGoDown).toBe(false);
    });

    it('completes a set or run with a red ace', () => {
        expect(scoreHand(cards("7C 7H 4S 5S 6S 1D"), {S : 1, R : 1}).readyToGoDown).toBe(false);
        expect(scoreHand(cards("7C 7H 7S 4S 5S 6S 1D"), {S : 1, R : 1}).readyToGoDown).toBe(true);
    });

    it('plays red aces as aces when that makes a setrun', () => {
        expect(scoreHand(cards("1C 1H 1D 7S 9C"), {S : 1, R : 0}).readyToGoDown).toBe(true);
        expect(planGoDown(cards("1C 1H 1D 7S 9C"), {S : 1, R : 0})?.table.map(set => names(set).toSorted())).toEqual([["1C", "1D", "1H"]]);
        expect(planGoDown(cards("1H 2H 3H 1D 9C"), {S : 0, R : 1})?.table.map(names)).toEqual([["1H", "2H", "3H", "1D"]]);
    });

    it('does not use the same card in a run and a set', () => {
        const result = scoreHand(cards("4S 5S 6S 7S 7C 7H"), {S : 1, R : 1});
        expect(result.readyToGoDown).toBe(false);
    });
});

describe('wantsCard', () => {
    it('takes a card that builds towards the requirement', () => {
        expect(wantsCard(cards("7C 7H 2S 9D"), {S : 2, R : 0}, card("7D"))).toBe(true);
        expect(wantsCard(cards("7C 7H 2S 9D"), {S : 2, R : 0}, card("12S"))).toBe(false);
    });
});

describe('planGoDown', () => {
    it('lays down the best hand and keeps the rest', () => {
        const plan = planGoDown(cards("7C 7H 7D 2S 2H 2C 9D 13S"), {S : 2, R : 0});
        expect(plan?.table).toHaveLength(2);
        expect(plan?.rest.map(c => c.displayString)).toEqual(["9D", "13S"]);
    });

    it('waits when the requirement is not met', () => {
        expect(planGoDown(cards("7C 7H 2S 2H 9D"), {S : 2, R : 0})).toBeNull();
    });

    it('lays down the setruns worth the most points', () => {
        const plan = planGoDown(cards("2C 2D 2S 13C 13D 13S 9H"), {S : 1, R : 0});
        expect(plan?.table.map(names)).toEqual([["13C", "13D", "13S"]]);
    });

    it('lays down the setruns that let it add the most to the tables', () => {
        const plan = (hand: Card[], tables: Setrun[][]) => planGoDown(hand, {S : 2, R : 0}, tables)?.table.map(names);
        const hand = cards("13C 13D 13H 2C 2D 2S 9C 9D 9S");
        expect(plan(hand, [])).toEqual([["13C", "13D", "13H"], ["9C", "9D", "9S"]]);
        // with someone's kings on the table, it keeps its kings back to add to them, and goes out
        const kings = setrun("13S 13H 13C", SET);
        expect(plan(hand, [[kings]])).toEqual([["2C", "2D", "2S"], ["9C", "9D", "9S"]]);
    });

    it('fills a gap in a run with a wild ace', () => {
        const plan = planGoDown(cards("4S 5S 7S 8S 1D 9C"), {S : 0, R : 1});
        expect(plan?.table.map(names)).toEqual([["4S", "5S", "1D", "7S", "8S"]]);
        expect(plan?.rest.map(c => c.displayString)).toEqual(["9C"]);
    });
});

describe('chooseDiscard', () => {
    it('throws away the highest card that is no use', () => {
        const hand = cards("7C 7H 7D 2S 2H 9D 4C");
        expect(hand[chooseDiscard(hand, {S : 2, R : 0}, false)].displayString).toBe("9D");
    });

    it('keeps red aces', () => {
        const hand = cards("1H 3C 2D");
        expect(hand[chooseDiscard(hand, {S : 2, R : 0}, true)].displayString).toBe("3C");
    });

    it('at the hard level, collects the run it can still finish', () => {
        const hand = cards("5S 6S 7S 2D 3D 4D");
        // a normal bot keeps the higher run; a hard bot that knows the spades are dead keeps the diamonds
        expect(hand[chooseDiscard(hand, {S : 0, R : 1}, false)].displayString).toBe("4D");
        const insight = {danger : () => 0, outs : (_type: SetrunType, run: Card[]) => (run[0].suit === "S") ? 0 : 4};
        expect(hand[chooseDiscard(hand, {S : 0, R : 1}, false, insight)].displayString).toBe("7S");
    });

    it('given the danger of each card, weighs it against the points', () => {
        const discard = (str: string, danger?: (c: Card) => number) => {
            const hand = cards(str);
            const insight = danger && {danger, outs : () => 4};
            return hand[chooseDiscard(hand, {S : 2, R : 0}, false, insight)].displayString;
        };
        // a normal bot throws the highest card, and a hard bot the most points
        expect(discard("1S 13C 12D 4C")).toBe("13C");
        expect(discard("1S 13C 12D 4C", () => 0)).toBe("1S");
        // of two cards worth about the same, the safer one
        expect(discard("13C 12D 4C", c => (c.displayString === "13C") ? 1 : 0)).toBe("12D");
        // but not a card worth much less
        expect(discard("13C 5D 4C", c => (c.displayString === "13C") ? 1 : 0)).toBe("13C");
    });
});

describe('findAddition', () => {
    it('finds a card that extends a setrun on any table', () => {
        const tables = [[], [setrun("4S 5S 6S 7S", RUN)]];
        const found = findAddition(cards("9D 8S"), tables);
        expect(found).toEqual({card : card("8S"), target : {seat : 1, index : 0}});
    });

    it('reports when nothing fits', () => {
        expect(findAddition(cards("9D 10S"), [[setrun("4S 5S 6S 7S", RUN)]])).toBeNull();
    });
});

describe('botMove', () => {
    const newGame = () => createGame({names : ["A", "B", "C", "D"], seed : 11});
    const play = (state: GameState, seat: number, command: Parameters<typeof apply>[2]) => {
        let result = apply(state, seat, command, 0);
        if (!result.ok) throw new Error(result.error);
        return result.state;
    };

    it('at the hard level, discards what the next player seems not to want', () => {
        let state = play(newGame(), 0, {type : "draw", from : "discard"});
        state.seats[0].hand = cards("12D 11S 4C");
        state.log.push({type : "draw", seat : 1, from : "discard", card : card("12C")});
        expect(botMove(viewFor(state, 0, 0))).toMatchObject({type : "discard", card : "12D"});
        // (a hard bot with seed 3 happens to remember the pickup; it forgets 1 thing in 20 straight away)
        expect(botMove(viewFor(state, 0, 0), {level : "hard", seed : 3})).toMatchObject({type : "discard", card : "11S"});
    });

    it('at the hard level, may hold off going down early in the game, if it dares', () => {
        const moves = (hand: string, risk: number, setUp: (state: GameState) => void = () => {}) => {
            let state = play(newGame(), 0, {type : "draw", from : "discard"});
            state.seats[0].hand = cards(hand);
            setUp(state);
            return Array.from({length : 30}, (_, seed) => botMove(viewFor(state, 0, 0), {level : "hard", seed, risk})?.type);
        };
        const sets = "7C 7D 7S 9C 9H 9S 2D 4H";
        // a bold bot sometimes waits, and otherwise goes down
        expect(new Set(moves(sets, 1))).toEqual(new Set(["goDown", "discard"]));
        // a cautious one never waits
        expect(new Set(moves(sets, 0))).toEqual(new Set(["goDown"]));
        // nor does anyone once someone else is down, or when going down lets it go out
        expect(new Set(moves(sets, 1, state => {
            state.seats[2].isDown = true;
            state.seats[2].table = [setrun("5C 5D 5H", SET)];
        }))).toEqual(new Set(["goDown"]));
        expect(new Set(moves("7C 7D 7S 9C 9H 9S 2D", 1))).toEqual(new Set(["goDown"]));
        // nor in a round that needs more cards (round 5: 2 sets and a run)
        expect(new Set(moves(sets + " 3H 5H 6H 13C", 1, state => {
            state.round = 4;
        }))).toEqual(new Set(["goDown"]));
    });

    it('draws on its turn and waits otherwise', () => {
        const state = newGame();
        expect(botMove(viewFor(state, 0, 0))?.type).toBe("draw");
        expect(botMove(viewFor(state, 1, 0))).toBeNull();
    });

    it("doesn't take a discard it would throw straight back", () => {
        const state = newGame();
        state.round = 6; // three runs
        state.discard = [card("9D")];
        state.seats[0].hand = cards("2D 3D 4D 5D 6D 7D 8D 4H 5H 6H 7H 8H");
        expect(botMove(viewFor(state, 0, 0))).toEqual({type : "draw", from : "deck"});
        state.seats[0].hand = cards("2D 3D 4D 5D 6D 7D 8D 4H 5H 6H 7H 13C");
        expect(botMove(viewFor(state, 0, 0))).toEqual({type : "draw", from : "discard"});
    });

    it('once down, only takes a discard that fits a setrun', () => {
        const state = newGame();
        state.seats[0].isDown = true;
        state.seats[0].table = [setrun("7C 7D 7S", SET)];
        state.seats[0].hand = cards("4C 9S");
        state.discard = [card("4D")];
        expect(botMove(viewFor(state, 0, 0))).toEqual({type : "draw", from : "deck"});
        state.discard = [card("7H")];
        expect(botMove(viewFor(state, 0, 0))).toEqual({type : "draw", from : "discard"});
    });

    it('answers a claim window, and waits for it to close before playing on', () => {
        const state = play(newGame(), 0, {type : "draw", from : "deck"});
        for (let seat of [1, 2, 3]) expect(["claim", "pass"]).toContain(botMove(viewFor(state, seat, 0))?.type);
        expect(botMove(viewFor(state, 0, 0))).toBeNull();
    });

    it('is ready to start as soon as a round is dealt', () => {
        const state = createGame({names : ["A", "B", "C", "D"], seed : 11, lookMs : 30_000});
        expect(botMove(viewFor(state, 0, 0))).toEqual({type : "start"});
        state.look!.ready[0] = true;
        expect(botMove(viewFor(state, 0, 0))).toBeNull();
    });

    it('is ready for the next round as soon as a round ends', () => {
        const state = newGame();
        state.phase = "roundEnd";
        expect(botMove(viewFor(state, 2, 0))).toEqual({type : "ready"});
        state.seats[2].ready = true;
        expect(botMove(viewFor(state, 2, 0))).toBeNull();
    });

    it('at the hard level, puts a red ace where it can follow it up, or else where nobody can', () => {
        const adding = (hand: string, profile: BotProfile = {level : "hard", seed : 3}) => {
            let state = play(newGame(), 0, {type : "draw", from : "discard"});
            state.seats[0].hand = cards(hand);
            state.seats[0].table = [setrun("9H 10H 11H 12H 13H", RUN)];
            state.seats[0].isDown = true;
            return botMove(viewFor(state, 0, 0), profile);
        };
        // with the 7♥ to follow, as the 8♥
        expect(adding("1D 7H 3S")).toEqual({type : "addToSetrun", card : "1D", target : {seat : 0, index : 0}, end : "low"});
        // with nothing to follow, on top, where nothing can go after it
        expect(adding("1D 3S")).toEqual({type : "addToSetrun", card : "1D", target : {seat : 0, index : 0}, end : "high"});
        // a normal bot leaves it to the rules
        expect(adding("1D 3S", NORMAL)).toEqual({type : "addToSetrun", card : "1D", target : {seat : 0, index : 0}});

        // going down with J–K♥ and the A♦ (round 2: a set and a run)
        let state = play(newGame(), 0, {type : "draw", from : "discard"});
        state.round = 1;
        state.seats[0].hand = cards("11H 12H 13H 1D 5C 5S 5D 2S");
        const goDown = botMove(viewFor(state, 0, 0), {level : "hard", seed : 3});
        expect(goDown?.type === "goDown" && goDown.setruns.find(s => s.type === RUN)).toMatchObject({from : 11});
        const plain = botMove(viewFor(state, 0, 0), NORMAL);
        expect(plain?.type === "goDown" && plain.setruns.find(s => s.type === RUN)).not.toHaveProperty("from");
    });

    it('goes down when it can, then adds cards one at a time, then discards', () => {
        let state = play(newGame(), 0, {type : "draw", from : "discard"});
        state.seats[0].hand = cards("7C 7H 7D 9S 9H 9C 8S 4D");
        state.seats[0].hand.forEach((c, i) => c.id = "c" + i);
        state.seats[1].table = [setrun("4S 5S 6S 7S", RUN)];
        state.seats[1].isDown = true;
        const goDown = botMove(viewFor(state, 0, 0));
        expect(goDown).toEqual({type : "goDown", setruns : [
            {type : SET, cards : ["c0", "c1", "c2"]},
            {type : SET, cards : ["c3", "c4", "c5"]}
        ]});
        state = play(state, 0, goDown!);
        const add = botMove(viewFor(state, 0, 0));
        expect(add).toEqual({type : "addToSetrun", card : "c6", target : {seat : 1, index : 0}});
        state = play(state, 0, add!);
        expect(botMove(viewFor(state, 0, 0))).toEqual({type : "discard", card : "c7"});
    });
});
