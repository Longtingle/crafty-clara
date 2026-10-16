// @vitest-environment node
import type {Command} from '../engine/game.ts';
import {linesFor} from '../engine/catalogue.ts';
import type {GameView} from '../engine/view.ts';
import {createHost, replay} from './host.ts';
import {createLocalPair} from './transport.ts';
import {createTestClock} from './testing.ts';
import {PROTOCOL, type ClientMessage, type HostMessage, type SeatInfo} from './protocol.ts';

const NAMES = ["Ann", "Bob", "Cat", "Dan"];
// two people, and two of the cast
const SEATS: SeatInfo[] = [
    {level : null, character : null},
    {level : "normal", character : "alan"},
    {level : null, character : null},
    {level : "hard", character : "clara"}
];

// A host with a port at every seat, each said hello, collecting what each seat is sent.
const setUp = () => {
    const clock = createTestClock();
    const host = createHost({names : NAMES, seats : SEATS, seed : 5, claimWindowMs : 6000, clock});
    const received: HostMessage[][] = NAMES.map(() => []);
    const ports = NAMES.map((_, seat) => {
        const [port, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
        port.listen(message => received[seat].push(message));
        host.connect(seat, hostEnd);
        port.send({type : "hello", protocol : PROTOCOL});
        return port;
    });
    clock.advance(0);
    const send = (seat: number, command: Command) => {
        ports[seat].send({type : "command", command});
        clock.advance(0);
    };
    const views = (seat: number): GameView[] =>
        received[seat].flatMap(message => message.type === "view" ? [message.view] : []);
    const counts = () => received.map(messages => messages.length);
    return {clock, host, ports, received, send, views, counts};
};

describe('host', () => {
    it('welcomes each seat that says hello, telling it who sits where, then sends its own view', () => {
        const {host, received, views} = setUp();
        NAMES.forEach((_, seat) => {
            expect(received[seat][0]).toEqual({type : "welcome", protocol : PROTOCOL, seat, seats : SEATS});
            expect(received[seat]).toHaveLength(2);
            expect(views(seat)[0].seat).toBe(seat);
            expect(views(seat)[0].hand).toEqual(host.state().seats[seat].hand);
        });
    });

    it('sends nothing to a seat until it says hello, and hangs up on one in another version', () => {
        const clock = createTestClock();
        const host = createHost({names : NAMES, seed : 5, clock});
        const [port, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
        const received: HostMessage[] = [];
        port.listen(message => received.push(message));
        const closed = vi.fn();
        port.onClose(closed);
        host.connect(0, hostEnd);
        port.send({type : "command", command : {type : "start"}});
        clock.advance(0);
        expect(received).toEqual([]);
        port.send({type : "hello", protocol : PROTOCOL + 1});
        clock.advance(0);
        expect(received).toEqual([{type : "mismatch", protocol : PROTOCOL}]);
        expect(closed).toHaveBeenCalled();
    });

    it('sends copies, so nothing a seat holds is shared with the host', () => {
        const {host, views} = setUp();
        expect(views(0)[0].hand).not.toBe(host.state().seats[0].hand);
    });

    it('applies a command and sends every seat the new view', () => {
        const {host, send, views, counts} = setUp();
        send(0, {type : "draw", from : "discard"});
        expect(host.state().phase).toBe("play");
        expect(counts()).toEqual([3, 3, 3, 3]);
        expect(views(2)[1]).toMatchObject({turn : 0, phase : "play"});
        expect(views(2)[1].seats[0].cards).toHaveLength(13);
    });

    it('refuses a command, telling only the seat that sent it why', () => {
        const {host, send, received, counts} = setUp();
        const before = host.state();
        send(1, {type : "draw", from : "deck"});
        expect(host.state()).toBe(before);
        expect(counts()).toEqual([2, 3, 2, 2]);
        expect(received[1][2]).toEqual({type : "refused", command : {type : "draw", from : "deck"}, error : "It's not your turn", code : "illegal"});
    });

    it('refuses a command that isn’t one, and keeps the rest of a command out of the game', () => {
        const {host, send, received, views} = setUp();
        // drawn from somewhere made up, so the log would show everyone the card
        send(0, {type : "draw", from : "Deck"} as unknown as Command);
        expect(received[0].at(-1)).toEqual({type : "refused", command : {type : "draw", from : "Deck"}, error : "That isn't a move in this game", code : "malformed"});
        send(0, {type : "goDown", setruns : 7} as unknown as Command);
        expect(received[0].at(-1)).toMatchObject({type : "refused", code : "malformed"});
        expect(host.state().phase).toBe("draw");

        // anything else a command carries is dropped
        send(0, {type : "draw", from : "deck", card : "a lie", secret : {x : 1}} as unknown as Command);
        expect(host.state().log).toEqual([{type : "draw", seat : 0, from : "deck", card : host.state().seats[0].hand.at(-1)}]);
        // and the card stays hidden from the others
        expect(views(1).at(-1)?.log[0]).toMatchObject({from : "deck", card : null});
        expect(host.journal().entries.map(entry => "command" in entry && entry.command)).toEqual([{type : "draw", from : "deck"}]);
    });

    it('ignores a message that isn’t one', () => {
        const {clock, ports, counts} = setUp();
        const before = counts();
        ports[0].send(null as unknown as ClientMessage);
        ports[0].send("draw" as unknown as ClientMessage);
        clock.advance(0);
        expect(counts()).toEqual(before);
    });

    describe('table talk', () => {
        const blame = linesFor("alan", "dealBlame")[0];

        it('passes on a line a seat says to every seat, with when it was said, and changes nothing', () => {
            const {host, ports, received, clock, send} = setUp();
            send(0, {type : "draw", from : "discard"});
            const before = host.state();
            ports[1].send({type : "say", line : {id : blame.id, to : 3}});
            clock.advance(0);
            expect(host.state()).toBe(before);
            for (let messages of received) expect(messages.at(-1)).toEqual({type : "said", seat : 1, line : {id : blame.id, to : 3}, round : 0, after : 1});
        });

        it('drops a line the speaker couldn’t say, or that comes too soon after their last', () => {
            const {ports, received, clock} = setUp();
            const counts = () => received.map(messages => messages.length);
            const before = counts();
            const drop = (seat: number, line: unknown) => {
                ports[seat].send({type : "say", line} as ClientMessage);
                clock.advance(1000);
                expect(counts()).toEqual(before);
            };
            // someone else's line, and a line nobody wrote
            drop(3, {id : blame.id, to : 0});
            drop(0, {id : blame.id, to : 3});
            drop(1, {id : "alan.dealBlame.made-up", text : "Something rude"});
            // said to itself, to nobody there, or naming a card that isn't one
            drop(1, {id : blame.id, to : 1});
            drop(1, {id : blame.id, to : 9});
            drop(1, {id : blame.id, card : "<b>"});

            ports[1].send({type : "say", line : {id : blame.id, to : 3, text : "Ignored"}} as never);
            ports[1].send({type : "say", line : {id : blame.id, to : 2}});
            clock.advance(0);
            // the line, without what it shouldn't carry; and the next, too soon, dropped
            expect(received[0].at(-1)).toEqual({type : "said", seat : 1, line : {id : blame.id, to : 3}, round : 0, after : 0});
            expect(counts()).toEqual(before.map(count => count + 1));
        });
    });

    it('closes a claim window at its deadline', () => {
        const {clock, host, send, views, counts} = setUp();
        send(0, {type : "draw", from : "deck"});
        expect(views(1).at(-1)?.claim).toMatchObject({canAnswer : true, closesIn : 6000});
        clock.advance(5999);
        expect(host.state().claim).not.toBeNull();
        expect(counts()).toEqual([3, 3, 3, 3]);
        clock.advance(1);
        expect(host.state().claim).toBeNull();
        expect(counts()).toEqual([4, 4, 4, 4]);
        expect(views(1).at(-1)?.claim).toBeNull();
    });

    it('forgets the deadline once a claim window is settled', () => {
        const {clock, host, send, counts} = setUp();
        send(0, {type : "draw", from : "deck"});
        send(1, {type : "claim"});
        expect(host.state().claim).toBeNull();
        expect(host.state().seats[1].hand).toHaveLength(13);
        clock.advance(10000);
        expect(counts()).toEqual([4, 4, 4, 4]);
    });

    it('keeps a journal that replays the game exactly', () => {
        const {clock, host, send} = setUp();
        send(0, {type : "draw", from : "deck"});
        clock.advance(6000);
        host.setClaimTimes(8000, 2000);
        send(0, {type : "discard", card : host.state().seats[0].hand[0].id});
        send(1, {type : "draw", from : "deck"});
        send(2, {type : "claim"});
        clock.advance(2000);
        const journal = host.journal();
        expect(journal.entries.map(entry => Object.keys(entry).filter(key => key !== "at")[0]))
            .toEqual(["seat", "expire", "claimTimes", "seat", "seat", "seat", "expire"]);
        expect(replay(journal)).toEqual(host.state());
    });

    it('lets a seat reconnect, and sends only to the new connection', () => {
        const {clock, host, send, counts} = setUp();
        const [port, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
        const fresh: HostMessage[] = [];
        port.listen(message => fresh.push(message));
        host.connect(2, hostEnd);
        port.send({type : "hello", protocol : PROTOCOL});
        clock.advance(0);
        send(0, {type : "draw", from : "discard"});
        expect(fresh.map(message => message.type)).toEqual(["welcome", "view", "view"]);
        expect(counts()).toEqual([3, 3, 2, 3]);
    });

    it('stops sending to a seat that hangs up', () => {
        const {clock, ports, send, counts} = setUp();
        ports[3].close();
        clock.advance(0);
        send(0, {type : "draw", from : "discard"});
        expect(counts()).toEqual([3, 3, 3, 2]);
    });

    it('stops when closed', () => {
        const {clock, host, send, counts} = setUp();
        send(0, {type : "draw", from : "deck"});
        host.close();
        send(1, {type : "claim"});
        clock.advance(10000);
        expect(counts()).toEqual([3, 3, 3, 3]);
        expect(host.state().claim).not.toBeNull();
    });
});
