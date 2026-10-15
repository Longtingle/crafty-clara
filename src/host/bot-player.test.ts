// @vitest-environment node
import {apply, createGame, expire, type Command, type GameState} from '../engine/game.ts';
import {viewFor} from '../engine/view.ts';
import {startBot} from './bot-player.ts';
import {createLocalPair} from './transport.ts';
import {createTestClock} from './testing.ts';
import type {ClientMessage, HostMessage, RefusedMessage} from './protocol.ts';

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
    hostEnd.listen(message => sent.push(message.command));
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

    it('reports a refused move, but not an answer that crossed with the claim window closing', () => {
        const {clock, hostEnd, refused} = setUp();
        const late: RefusedMessage = {type : "refused", command : {type : "pass"}, error : "There's no discard for you to claim"};
        const wrong: RefusedMessage = {type : "refused", command : {type : "draw", from : "deck"}, error : "It's not your turn"};
        hostEnd.send(late);
        hostEnd.send(wrong);
        clock.advance(0);
        expect(refused).toEqual([wrong]);
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
