// @vitest-environment node
import type {BotProfile} from '../engine/bot.ts';
import {apply, createGame, expire, type Command, type GameState} from '../engine/game.ts';
import {linesFor, type Line} from '../engine/catalogue.ts';
import {viewFor} from '../engine/view.ts';
import {startBot, TALK_PACE} from './bot-player.ts';
import {createLocalPair} from './transport.ts';
import {createTestClock} from './testing.ts';
import {PROTOCOL, type ClientMessage, type HostMessage, type RefusedMessage} from './protocol.ts';

const PACE = {draw : 1000, answer : 500, move : 800, ready : 0};

const play = (state: GameState, seat: number, command: Command) => {
    let result = apply(state, seat, command, 0);
    if (!result.ok) throw new Error(result.error);
    return result.state;
};

const newGame = () => createGame({names : ["Ann", "Bob", "Cat", "Dan"], seed : 2});

// Seat 0 has taken the turned-up card and discarded, so it's seat 1's turn.
const seatOnesTurn = () => {
    let state = play(newGame(), 0, {type : "draw", from : "discard"});
    return play(state, 0, {type : "discard", card : state.seats[0].hand[0].id});
};

// Seat 0 has drawn from the deck, so seat 1 may claim the discard.
const claimWindow = () => play(newGame(), 0, {type : "draw", from : "deck"});

// A bot in seat 1, with this test acting as its host.
const setUp = () => {
    const clock = createTestClock();
    const [botEnd, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
    const sent: Command[] = [];
    hostEnd.listen(message => {
        if (message.type === "command") sent.push(message.command);
    });
    const refused: RefusedMessage[] = [];
    const stop = startBot(botEnd, {clock, pace : PACE, onRefused : message => refused.push(message)});
    const show = (state: GameState) => {
        hostEnd.send({type : "view", view : viewFor(state, 1, clock.now())});
        clock.advance(0);
    };
    return {clock, hostEnd, sent, refused, stop, show};
};

describe('a bot player', () => {
    it('pauses before its move', () => {
        const {clock, sent, show} = setUp();
        show(seatOnesTurn());
        clock.advance(999);
        expect(sent).toEqual([]);
        clock.advance(1);
        expect(sent).toEqual([{type : "draw", from : expect.any(String)}]);
    });

    it('answers a claim after its pause, however many views come in meanwhile', () => {
        const {clock, sent, show} = setUp();
        show(claimWindow());
        clock.advance(300);
        show(claimWindow());
        clock.advance(200);
        expect(sent).toHaveLength(1);
        expect(["claim", "pass"]).toContain(sent[0].type);
    });

    it('drops a move it no longer has to make', () => {
        const {clock, sent, show} = setUp();
        show(claimWindow());
        clock.advance(300);
        // the window has closed by the time the bot would answer
        show(expire(claimWindow(), 6000));
        clock.advance(5000);
        expect(sent).toEqual([]);
    });

    it('says hello', () => {
        const clock = createTestClock();
        const [botEnd, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
        const received: ClientMessage[] = [];
        hostEnd.listen(message => received.push(message));
        startBot(botEnd, {clock});
        clock.advance(0);
        expect(received).toEqual([{type : "hello", protocol : PROTOCOL}]);
    });

    it('reports a refused move, but not an answer that crossed with the claim window closing', () => {
        const {clock, hostEnd, refused} = setUp();
        const late: RefusedMessage = {type : "refused", command : {type : "pass"}, error : "There's no discard for you to claim", code : "late"};
        const wrong: RefusedMessage = {type : "refused", command : {type : "draw", from : "deck"}, error : "It's not your turn", code : "illegal"};
        hostEnd.send(late);
        hostEnd.send(wrong);
        clock.advance(0);
        expect(refused).toEqual([wrong]);
    });

    it('pauses as long as its pace says at the time, which can change', () => {
        const clock = createTestClock();
        const [botEnd, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
        const sent: Command[] = [];
        hostEnd.listen(message => {
            if (message.type === "command") sent.push(message.command);
        });
        let pace = {...PACE, draw : 3000};
        startBot(botEnd, {clock, pace : () => pace});
        pace = {...PACE, draw : 500};
        hostEnd.send({type : "view", view : viewFor(seatOnesTurn(), 1, clock.now())});
        clock.advance(499);
        expect(sent).toEqual([]);
        clock.advance(1);
        expect(sent).toHaveLength(1);
    });

    describe('talking', () => {
        // A bot in seat 3, with this test acting as its host, collecting what it says.
        const listen = (profile: BotProfile) => {
            const clock = createTestClock();
            const [botEnd, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
            const said: Line[] = [];
            hostEnd.listen(message => {
                if (message.type === "say") said.push(message.line);
            });
            startBot(botEnd, {clock, profile});
            // a moment into the round, so there's no deal to talk about
            hostEnd.send({type : "view", view : viewFor(play(newGame(), 0, {type : "draw", from : "discard"}), 3, 0)});
            clock.advance(0);
            return {clock, hostEnd, said};
        };
        const BLAMED: Line = {id : linesFor("alan", "dealBlame")[1].id, to : 3};

        it('answers back, after a moment, when blamed for the deal', () => {
            let answered = 0;
            for (let seed = 1; seed <= 10; seed++) {
                const {clock, hostEnd, said} = listen({level : "normal", seed, character : "gemma"});
                hostEnd.send({type : "said", seat : 1, line : BLAMED, round : 0, after : 1});
                clock.advance(TALK_PACE.answer - 1);
                expect(said).toEqual([]);
                clock.advance(1);
                if (said.length === 0) continue;
                answered++;
                expect(said).toHaveLength(1);
                expect(said[0]).toMatchObject({to : 1});
                expect(said[0].id).toMatch(/^gemma\.dealer\./);
            }
            expect(answered).toBeGreaterThan(5);
        });

        it("says nothing, if it isn't one of the cast", () => {
            const {clock, hostEnd, said} = listen({level : "normal", seed : 1});
            hostEnd.send({type : "said", seat : 1, line : BLAMED, round : 0, after : 1});
            clock.advance(10_000);
            expect(said).toEqual([]);
        });
    });

    it('does nothing once stopped', () => {
        const {clock, sent, stop, show} = setUp();
        show(seatOnesTurn());
        stop();
        clock.advance(5000);
        show(seatOnesTurn());
        clock.advance(5000);
        expect(sent).toEqual([]);
    });
});
