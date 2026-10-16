// @vitest-environment node
import type {Command} from '../engine/game.ts';
import type {GameView} from '../engine/view.ts';
import {createHost} from './host.ts';
import {createLocalPair} from './transport.ts';
import {createTestClock} from './testing.ts';
import type {ClientMessage, HostMessage} from './protocol.ts';

const NAMES = ["Ann", "Bob", "Cat", "Dan"];

// A host with a port at every seat, collecting what each seat is sent.
const setUp = () => {
    const clock = createTestClock();
    const host = createHost({names : NAMES, seed : 5, claimWindowMs : 6000, clock});
    const received: HostMessage[][] = NAMES.map(() => []);
    const ports = NAMES.map((_, seat) => {
        const [port, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
        port.listen(message => received[seat].push(message));
        host.connect(seat, hostEnd);
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
    it('sends each seat its own view when it connects', () => {
        const {host, received, views} = setUp();
        expect(received.map(messages => messages.length)).toEqual([1, 1, 1, 1]);
        NAMES.forEach((_, seat) => {
            expect(views(seat)[0].seat).toBe(seat);
            expect(views(seat)[0].hand).toEqual(host.state().seats[seat].hand);
        });
    });

    it('sends copies, so nothing a seat holds is shared with the host', () => {
        const {host, views} = setUp();
        expect(views(0)[0].hand).not.toBe(host.state().seats[0].hand);
    });

    it('applies a command and sends every seat the new view', () => {
        const {host, send, views, counts} = setUp();
        send(0, {type : "draw", from : "discard"});
        expect(host.state().phase).toBe("play");
        expect(counts()).toEqual([2, 2, 2, 2]);
        expect(views(2)[1]).toMatchObject({turn : 0, phase : "play"});
        expect(views(2)[1].seats[0].cards).toHaveLength(13);
    });

    it('refuses a command, telling only the seat that sent it', () => {
        const {host, send, received, counts} = setUp();
        const before = host.state();
        send(1, {type : "draw", from : "deck"});
        expect(host.state()).toBe(before);
        expect(counts()).toEqual([1, 2, 1, 1]);
        expect(received[1][1]).toEqual({type : "refused", command : {type : "draw", from : "deck"}, error : "It's not your turn"});
    });

    it("passes on what a seat says to every seat, with when it was said, and changes nothing", () => {
        const {host, ports, received, clock, send} = setUp();
        send(0, {type : "draw", from : "discard"});
        const before = host.state();
        const line = {id : "alan.dealBlame.0", text : "Who dealt this rubbish?", to : 3, invites : "dealer"} as const;
        ports[1].send({type : "say", line});
        clock.advance(0);
        expect(host.state()).toBe(before);
        for (let messages of received) expect(messages.at(-1)).toEqual({type : "said", seat : 1, line, round : 0, after : 1});

        // too soon after the last, or not a line at all, and it's dropped
        const counts = received.map(messages => messages.length);
        ports[1].send({type : "say", line : {id : "a", text : "And another thing"}});
        ports[2].send({type : "say", line : {id : "b", text : "x".repeat(500)}});
        ports[2].send({type : "say", line : {id : "c"}} as never);
        clock.advance(0);
        expect(received.map(messages => messages.length)).toEqual(counts);
        clock.advance(1000);
        ports[1].send({type : "say", line : {id : "a", text : "And another thing"}});
        clock.advance(0);
        expect(received[0].at(-1)).toMatchObject({type : "said", seat : 1, line : {text : "And another thing"}});
    });

    it('refuses a command that makes no sense', () => {
        const {send, received} = setUp();
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        send(0, {type : "draw", from : "discard"});
        send(0, {type : "goDown", setruns : 7} as unknown as Command);
        expect(received[0].at(-1)).toMatchObject({type : "refused", error : "Something went wrong with that move"});
        expect(consoleError).toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it('closes a claim window at its deadline', () => {
        const {clock, host, send, views, counts} = setUp();
        send(0, {type : "draw", from : "deck"});
        expect(views(1).at(-1)?.claim).toMatchObject({canAnswer : true, closesIn : 6000});
        clock.advance(5999);
        expect(host.state().claim).not.toBeNull();
        expect(counts()).toEqual([2, 2, 2, 2]);
        clock.advance(1);
        expect(host.state().claim).toBeNull();
        expect(counts()).toEqual([3, 3, 3, 3]);
        expect(views(1).at(-1)?.claim).toBeNull();
    });

    it('forgets the deadline once a claim window is settled', () => {
        const {clock, host, send, counts} = setUp();
        send(0, {type : "draw", from : "deck"});
        send(1, {type : "claim"});
        expect(host.state().claim).toBeNull();
        expect(host.state().seats[1].hand).toHaveLength(13);
        clock.advance(10000);
        expect(counts()).toEqual([3, 3, 3, 3]);
    });

    it('lets a seat reconnect, and sends only to the new connection', () => {
        const {clock, host, send, counts} = setUp();
        const [port, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
        const fresh: HostMessage[] = [];
        port.listen(message => fresh.push(message));
        host.connect(2, hostEnd);
        clock.advance(0);
        send(0, {type : "draw", from : "discard"});
        expect(fresh.map(message => message.type)).toEqual(["view", "view"]);
        expect(counts()).toEqual([2, 2, 1, 2]);
    });

    it('stops when closed', () => {
        const {clock, host, send, counts} = setUp();
        send(0, {type : "draw", from : "deck"});
        host.close();
        send(1, {type : "claim"});
        clock.advance(10000);
        expect(counts()).toEqual([2, 2, 2, 2]);
        expect(host.state().claim).not.toBeNull();
    });
});
