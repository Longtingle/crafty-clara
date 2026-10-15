// @vitest-environment node
import {RUN, SET, getPoints, type Setrun} from './cards.ts';
import {checkSetrun} from './setruns.ts';
import {apply, createGame, expireClaims, type Command, type GameState, type Result} from './game.ts';
import {card} from './testing.ts';

const NAMES = ["Ann", "Bob", "Cat", "Dan"];
const newGame = (seed = 1) => createGame({names : NAMES, seed, claimWindowMs : 6000});

const unwrap = (result: Result): GameState => {
    if (!result.ok) throw new Error(result.error);
    return result.state;
};
const play = (state: GameState, seat: number, command: Command, now = 0) => unwrap(apply(state, seat, command, now));
const refusal = (state: GameState, seat: number, command: Command, now = 0) => {
    let result = apply(state, seat, command, now);
    return result.ok ? "accepted" : result.error;
};

// A copy of the state with some of it replaced. Hands are strings of cards
// ("7C 7H"), with ids "<seat>.<n>"; the deck's and discard pile's ids are
// "deck.<n>" and "discard.<n>".
const arrange = (state: GameState, {hands = {}, deck, discard, ...rest}: {
    hands?: Record<number, string>;
    deck?: string;
    discard?: string;
} & Partial<Omit<GameState, "deck" | "discard">>): GameState => {
    let next = {...structuredClone(state), ...rest};
    const toCards = (str: string, prefix: string) => str ? str.split(" ").map((c, i) => card(c, prefix + "." + i)) : [];
    for (let [seat, str] of Object.entries(hands)) next.seats[Number(seat)].hand = toCards(str, seat);
    if (deck !== undefined) next.deck = toCards(deck, "deck");
    if (discard !== undefined) next.discard = toCards(discard, "discard");
    return next;
};

// The id of a card in a seat's hand, by name.
const id = (state: GameState, seat: number, name: string): string => {
    let found = state.seats[seat].hand.find(c => c.displayString === name);
    if (!found) throw new Error(name + " isn't in seat " + seat + "'s hand");
    return found.id;
};

const setrun = (str: string, type: typeof SET | typeof RUN): Setrun => {
    let result = checkSetrun(str.split(" ").map(c => card(c, "table." + c)), type);
    if (!result.valid) throw new Error(str + " isn't a valid " + type);
    return result.setrun;
};

// Seat 0 has taken the turned-up card and discarded, so it's seat 1's turn.
const seatOnesTurn = () => {
    let state = play(newGame(), 0, {type : "draw", from : "discard"});
    return play(state, 0, {type : "discard", card : state.seats[0].hand[0].id});
};

describe('createGame', () => {
    it('deals 12 cards each, turns one up and leaves the rest as the deck', () => {
        const state = newGame();
        expect(state.seats.map(seat => seat.hand.length)).toEqual([12, 12, 12, 12]);
        expect(state.discard).toHaveLength(1);
        expect(state.deck).toHaveLength(104 - 48 - 1);
        expect(state).toMatchObject({round : 0, turn : 0, phase : "draw", claim : null, discardedBy : null});
    });

    it('numbers the cards in dealt order, so an id says nothing about the card', () => {
        const state = newGame();
        const all = [...state.seats.flatMap(seat => seat.hand), ...state.discard, ...state.deck];
        expect(new Set(all.map(c => c.id)).size).toBe(104);
        expect(state.seats[0].hand.map(c => c.id)).toEqual(
            Array.from({length : 12}, (_, i) => state.idPrefix + "-" + (i + 1)));
    });

    it('deals the same game from the same seed', () => {
        expect(newGame(5)).toEqual(newGame(5));
        expect(newGame(5).seats[0].hand).not.toEqual(newGame(6).seats[0].hand);
    });

    it('needs 2 to 6 players', () => {
        expect(() => createGame({names : ["Solo"], seed : 1})).toThrow();
        expect(() => createGame({names : Array(7).fill("P"), seed : 1})).toThrow();
        expect(createGame({names : Array(6).fill("P"), seed : 1}).deck).toHaveLength(104 - 72 - 1);
    });
});

describe('taking turns', () => {
    it('lets only the player in turn draw, once', () => {
        const state = newGame();
        expect(refusal(state, 1, {type : "draw", from : "deck"})).toBe("It's not your turn");
        const drawn = play(state, 0, {type : "draw", from : "deck"});
        expect(drawn.seats[0].hand).toHaveLength(13);
        expect(drawn.seats[0].hand.at(-1)).toEqual(state.deck[0]);
        expect(refusal(drawn, 0, {type : "draw", from : "deck"})).toBe("You've already drawn");
        expect(refusal(state, 0, {type : "discard", card : state.seats[0].hand[0].id})).toBe("Draw a card first");
    });

    it('takes the top discard without opening a claim window', () => {
        const state = newGame();
        const drawn = play(state, 0, {type : "draw", from : "discard"});
        expect(drawn.seats[0].hand.at(-1)).toEqual(state.discard[0]);
        expect(drawn.discard).toHaveLength(0);
        expect(drawn.claim).toBeNull();
        expect(drawn.log).toEqual([{type : "draw", seat : 0, from : "discard", card : state.discard[0]}]);
    });

    it('passes the turn on with a discard, back round to the first seat', () => {
        const state = seatOnesTurn();
        expect(state).toMatchObject({turn : 1, phase : "draw", discardedBy : 0});
        const last = arrange(state, {turn : 3, phase : "play"});
        expect(play(last, 3, {type : "discard", card : last.seats[3].hand[0].id}).turn).toBe(0);
    });

    it('only discards a card from your hand', () => {
        const state = play(newGame(), 0, {type : "draw", from : "deck"}, 0);
        const later = expireClaims(state, 6000);
        expect(refusal(later, 0, {type : "discard", card : later.seats[1].hand[0].id}, 6000)).toBe("That card isn't in your hand");
    });

    it('never changes the state it is given', () => {
        const deepFreeze = <T>(value: T): T => {
            if (value && typeof value === "object") {
                Object.values(value).forEach(deepFreeze);
                Object.freeze(value);
            }
            return value;
        };
        let state = deepFreeze(newGame());
        state = deepFreeze(play(state, 0, {type : "draw", from : "deck"}));
        state = deepFreeze(play(state, 1, {type : "claim"}));
        state = deepFreeze(expireClaims(state, 6000));
        expect(state.seats[0].hand).toHaveLength(13);
    });
});

describe('claiming the discard', () => {
    it('opens to everyone else in turn order when the player in turn draws from the deck', () => {
        const state = play(newGame(), 0, {type : "draw", from : "deck"}, 1000);
        expect(state.claim).toEqual({
            card : state.discard[0].id,
            deadline : 7000,
            seats : [1, 2, 3],
            answers : [null, null, null, null]
        });
    });

    it('leaves out whoever discarded the card', () => {
        const state = play(seatOnesTurn(), 1, {type : "draw", from : "deck"});
        expect(state.claim?.seats).toEqual([2, 3]);
        expect(refusal(state, 0, {type : "claim"})).toBe("There's no discard for you to claim");
        expect(refusal(state, 1, {type : "claim"})).toBe("There's no discard for you to claim");
    });

    it('goes to the first claimant in line, even if a later one answered first', () => {
        let state = play(seatOnesTurn(), 1, {type : "draw", from : "deck"});
        const top = state.discard[0];
        state = play(state, 3, {type : "claim"});
        expect(state.claim).not.toBeNull();
        state = play(state, 2, {type : "claim"});
        expect(state.claim).toBeNull();
        expect(state.seats[2].hand).toContainEqual(top);
        expect(state.seats[3].hand).not.toContainEqual(top);
        expect(state.discard[0]).not.toEqual(top);
        expect(state.log.at(-1)).toEqual({type : "claim", seat : 2, card : top});
    });

    it('goes to a later claimant as soon as everyone ahead has passed', () => {
        let state = play(seatOnesTurn(), 1, {type : "draw", from : "deck"});
        const top = state.discard[0];
        state = play(state, 3, {type : "claim"});
        state = play(state, 2, {type : "pass"});
        expect(state.claim).toBeNull();
        expect(state.seats[3].hand).toContainEqual(top);
    });

    it('closes with the card still on the pile when everyone passes', () => {
        let state = play(seatOnesTurn(), 1, {type : "draw", from : "deck"});
        const top = state.discard[0];
        state = play(state, 2, {type : "pass"});
        expect(refusal(state, 2, {type : "claim"})).toBe("You've already answered");
        state = play(state, 3, {type : "pass"});
        expect(state.claim).toBeNull();
        expect(state.discard[0]).toEqual(top);
    });

    it('counts anyone who has not answered by the deadline as passing', () => {
        let state = play(seatOnesTurn(), 1, {type : "draw", from : "deck"}, 0);
        const top = state.discard[0];
        state = play(state, 3, {type : "claim"}, 100);
        expect(expireClaims(state, 5999)).toBe(state);
        state = expireClaims(state, 6000);
        expect(state.claim).toBeNull();
        expect(state.seats[3].hand).toContainEqual(top);
    });

    it('refuses a claim that arrives after the deadline', () => {
        const state = play(seatOnesTurn(), 1, {type : "draw", from : "deck"}, 0);
        expect(refusal(state, 2, {type : "claim"}, 6000)).toBe("There's no discard for you to claim");
    });

    it('lets the player in turn play on, but not discard, until it closes', () => {
        let state = arrange(seatOnesTurn(), {hands : {1 : "7C 7H 7D 9S 9H 9C 2D 4D 5D 13S 12S 10H"}});
        state = play(state, 1, {type : "draw", from : "deck"});
        state = play(state, 1, {type : "goDown", setruns : [
            {type : SET, cards : [id(state, 1, "7C"), id(state, 1, "7H"), id(state, 1, "7D")]},
            {type : SET, cards : [id(state, 1, "9S"), id(state, 1, "9H"), id(state, 1, "9C")]}
        ]});
        expect(state.seats[1].isDown).toBe(true);
        const discard: Command = {type : "discard", card : id(state, 1, "13S")};
        expect(refusal(state, 1, discard)).toBe("Wait until the other players have claimed or passed");
        state = play(state, 2, {type : "pass"});
        state = play(state, 3, {type : "pass"});
        expect(play(state, 1, discard).turn).toBe(2);
    });

    it('opens no window when nobody may claim', () => {
        const twoPlayers = createGame({names : ["Ann", "Bob"], seed : 1});
        let state = play(twoPlayers, 0, {type : "draw", from : "discard"});
        state = play(state, 0, {type : "discard", card : state.seats[0].hand[0].id});
        expect(play(state, 1, {type : "draw", from : "deck"}).claim).toBeNull();
    });
});

describe('going down', () => {
    // seat 0 has drawn, holding two sets; the first round needs two sets
    const ready = () => play(arrange(newGame(), {hands : {0 : "7C 7H 7D 9S 9H 9C 7S 1H 4D 5D 13S 12S"}}), 0, {type : "draw", from : "discard"});
    const sevens = ["0.0", "0.1", "0.2"];
    const nines = ["0.3", "0.4", "0.5"];
    const goDown = (...setruns: [typeof SET | typeof RUN, string[]][]): Command =>
        ({type : "goDown", setruns : setruns.map(([type, cards]) => ({type, cards}))});

    it('lays down the setruns and keeps the rest of the hand', () => {
        const state = play(ready(), 0, goDown([SET, sevens], [SET, nines]));
        expect(state.seats[0].isDown).toBe(true);
        expect(state.seats[0].table.map(s => s.cards.map(c => c.displayString))).toEqual([["7C", "7H", "7D"], ["9S", "9H", "9C"]]);
        expect(state.seats[0].hand).toHaveLength(13 - 6);
        expect(state.log.at(-1)).toEqual({type : "goDown", seat : 0});
        expect(refusal(state, 0, goDown([SET, sevens], [SET, nines]))).toBe("You're already down");
    });

    it('needs exactly the setruns the round asks for', () => {
        expect(refusal(ready(), 0, goDown([SET, sevens]))).toBe("This round you go down with 2 sets");
        expect(refusal(ready(), 0, goDown([SET, sevens], [RUN, ["0.8", "0.9"]]))).toBe("This round you go down with 2 sets");
    });

    it('says what is wrong with a setrun', () => {
        expect(refusal(ready(), 0, goDown([SET, ["0.0", "0.1", "0.10"]], [SET, nines])))
            .toBe("Every card in a set must have the same value.");
    });

    it('only uses cards from your hand, each once', () => {
        expect(refusal(ready(), 0, goDown([SET, sevens], [SET, ["nope", "0.4", "0.5"]]))).toBe("That card isn't in your hand");
        expect(refusal(ready(), 0, goDown([SET, sevens], [SET, ["0.0", "0.4", "0.5"]]))).toBe("A card can only go in one setrun");
    });

    it('comes before adding to setruns', () => {
        const state = ready();
        expect(refusal(state, 0, {type : "addToSetrun", card : id(state, 0, "7S"), target : {seat : 0, index : 0}}))
            .toBe("Go down before adding to setruns");
    });
});

describe('adding to setruns', () => {
    const down = () => {
        let state = arrange(newGame(), {hands : {0 : "7C 7H 7D 9S 9H 9C 7S 5S 4D 5D 13S 12S"}});
        state = play(state, 0, {type : "draw", from : "discard"});
        return play(state, 0, {type : "goDown", setruns : [
            {type : SET, cards : [id(state, 0, "7C"), id(state, 0, "7H"), id(state, 0, "7D")]},
            {type : SET, cards : [id(state, 0, "9S"), id(state, 0, "9H"), id(state, 0, "9C")]}
        ]});
    };

    it('adds a card that fits', () => {
        const state = play(down(), 0, {type : "addToSetrun", card : id(down(), 0, "7S"), target : {seat : 0, index : 0}});
        expect(state.seats[0].table[0].cards).toHaveLength(4);
        expect(state.seats[0].hand.map(c => c.displayString)).not.toContain("7S");
    });

    it('refuses a card that does not fit, or a setrun that is not there', () => {
        const state = down();
        expect(refusal(state, 0, {type : "addToSetrun", card : id(state, 0, "13S"), target : {seat : 0, index : 0}})).toBe("That card doesn't fit there");
        expect(refusal(state, 0, {type : "addToSetrun", card : id(state, 0, "7S"), target : {seat : 2, index : 0}})).toBe("There's no setrun there");
    });

    it("swaps a wild ace on another player's setrun and gives it back to you", () => {
        let state = down();
        state.seats[1].table = [setrun("4S 1H 6S 7S", RUN)];
        state.seats[1].isDown = true;
        state = play(state, 0, {type : "addToSetrun", card : id(state, 0, "5S"), target : {seat : 1, index : 0}});
        expect(state.seats[1].table[0].cards.map(c => c.displayString)).toEqual(["4S", "5S", "6S", "7S"]);
        const ace = state.seats[0].hand.at(-1)!;
        expect(ace).toMatchObject({displayString : "1H", value : 1, suit : "H", id : "table.1H"});
        expect(state.log.at(-1)).toMatchObject({type : "add", seat : 0, target : {seat : 1, index : 0}, returnedAce : ace});
    });
});

describe('the end of a round', () => {
    // seat 0 has drawn and discarded down to the King of spades
    const lastCard = () => arrange(newGame(), {
        hands : {0 : "13S", 1 : "1C 5D", 2 : "", 3 : "10H 11H 2S"},
        phase : "play"
    });

    it('comes when a player discards their last card; everyone scores what they hold', () => {
        const state = play(lastCard(), 0, {type : "discard", card : "0.0"});
        expect(state).toMatchObject({phase : "roundEnd", wentOut : 0, claim : null});
        expect(state.seats.map(seat => seat.scores)).toEqual([[0], [30], [0], [22]]);
        expect(state.log.at(-1)).toEqual({type : "out", seat : 0});
        expect(refusal(state, 1, {type : "draw", from : "deck"})).toBe("The round is over");
    });

    it('comes when a player lays down their last cards', () => {
        let state = arrange(newGame(), {hands : {0 : "7C 7H 7D 9S 9H 9C"}, phase : "play"});
        state = play(state, 0, {type : "goDown", setruns : [
            {type : SET, cards : ["0.0", "0.1", "0.2"]},
            {type : SET, cards : ["0.3", "0.4", "0.5"]}
        ]});
        expect(state).toMatchObject({phase : "roundEnd", wentOut : 0});
    });

    it('is followed by a new deal once every seat is ready, started by the next seat along', () => {
        let state = play(lastCard(), 0, {type : "discard", card : "0.0"});
        expect(refusal(newGame(), 0, {type : "ready"})).toBe("The round isn't over");
        for (let seat of [0, 1, 2]) state = play(state, seat, {type : "ready"});
        expect(state).toMatchObject({round : 0, phase : "roundEnd"});
        expect(state.seats.map(seat => seat.ready)).toEqual([true, true, true, false]);
        expect(refusal(state, 1, {type : "ready"})).toBe("Waiting for the other players");

        const next = play(state, 3, {type : "ready"});
        expect(next).toMatchObject({round : 1, turn : 1, phase : "draw", wentOut : null, log : []});
        expect(next.seats.map(seat => seat.hand.length)).toEqual([12, 12, 12, 12]);
        expect(next.seats.every(seat => !seat.isDown && !seat.ready && seat.table.length === 0)).toBe(true);
        expect(next.seats.map(seat => seat.scores)).toEqual([[0], [30], [0], [22]]);
    });

    it('ends the game after the last round', () => {
        const state = play(arrange(lastCard(), {round : 6}), 0, {type : "discard", card : "0.0"});
        expect(state.phase).toBe("gameEnd");
        expect(refusal(state, 1, {type : "ready"})).toBe("The game is over");
    });

    it('keeps who went out and who was down, round by round', () => {
        let state = lastCard();
        state.seats[0].isDown = true;
        state.seats[3].isDown = true;
        state = play(state, 0, {type : "discard", card : "0.0"});
        expect(state.outs).toEqual([0]);
        expect(state.seats.map(seat => seat.downs)).toEqual([[true], [false], [false], [true]]);

        // into the next round, as the scores are
        for (let seat of [0, 1, 2, 3]) state = play(state, seat, {type : "ready"});
        expect(state.outs).toEqual([0]);
        expect(state.seats.map(seat => seat.downs)).toEqual([[true], [false], [false], [true]]);
    });

    it('scores a hand with getPoints', () => {
        const state = play(lastCard(), 0, {type : "discard", card : "0.0"});
        expect(state.seats[3].scores[0]).toBe(getPoints(lastCard().seats[3].hand));
    });
});

describe('an empty deck', () => {
    it('is refilled from the discard pile, all but the top card, with new ids', () => {
        const before = arrange(newGame(), {deck : "", discard : "5C 6C 7C 8C"});
        const state = play(before, 0, {type : "draw", from : "deck"});
        expect(state.discard.map(c => c.id)).toEqual(["discard.0"]);
        expect(state.deck).toHaveLength(2);
        const drawn = state.seats[0].hand.at(-1)!;
        expect(["6C", "7C", "8C"]).toContain(drawn.displayString);
        expect([...state.deck, drawn].every(c => !c.id.startsWith("discard."))).toBe(true);
        expect(state.log.map(entry => entry.type)).toEqual(["reshuffle", "draw"]);
    });

    it('leaves only the discard pile when there is nothing to shuffle', () => {
        const state = arrange(newGame(), {deck : "", discard : "5C"});
        expect(refusal(state, 0, {type : "draw", from : "deck"})).toBe("The deck is empty");
        expect(play(state, 0, {type : "draw", from : "discard"}).seats[0].hand).toHaveLength(13);
    });

    it('ends the round after the turn in which it runs out for the third time', () => {
        let state = arrange(newGame(), {deck : "", discard : "5C 6C", reshuffles : 1});
        state = play(state, 0, {type : "draw", from : "deck"});
        expect(state).toMatchObject({deck : [], reshuffles : 2});
        state = expireClaims(state, 6000);
        const hands = state.seats.map(seat => seat.hand);
        state = play(state, 0, {type : "discard", card : state.seats[0].hand[0].id}, 6000);
        expect(state).toMatchObject({phase : "roundEnd", wentOut : null, outs : [null]});
        expect(state.log.at(-1)).toEqual({type : "deckOut", seat : 0});
        expect(state.seats.map(seat => seat.scores)).toEqual(state.seats.map(seat => [getPoints(seat.hand)]));
        expect(state.seats[0].hand).toHaveLength(hands[0].length - 1);
    });

    it('lets the game go on after a second reshuffle', () => {
        let state = arrange(newGame(), {deck : "", discard : "5C 6C 7C", reshuffles : 1});
        state = play(state, 0, {type : "draw", from : "deck"});
        state = expireClaims(state, 6000);
        state = play(state, 0, {type : "discard", card : state.seats[0].hand[0].id}, 6000);
        expect(state).toMatchObject({phase : "draw", turn : 1, reshuffles : 2});
    });
});
