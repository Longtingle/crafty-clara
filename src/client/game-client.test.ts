// @vitest-environment node
import {createGame} from '../engine/game.ts';
import {linesFor} from '../engine/catalogue.ts';
import {viewFor} from '../engine/view.ts';
import {createLocalPair} from '../host/transport.ts';
import {createTestClock} from '../host/testing.ts';
import {PROTOCOL, type ClientMessage, type HostMessage} from '../host/protocol.ts';
import {createGameClient} from './game-client.ts';

const SEATS = [{level : null, character : null}, {level : "hard", character : "clara"}] as const;

const setUp = () => {
    const clock = createTestClock();
    const [port, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
    const received: ClientMessage[] = [];
    hostEnd.listen(message => received.push(message));
    const client = createGameClient(port);
    const view = viewFor(createGame({names : ["Ann", "Clara"], seed : 1}), 0, 0);
    // what the host says first: welcome, then the view
    const welcome = () => {
        hostEnd.send({type : "welcome", protocol : PROTOCOL, seat : 0, seats : [...SEATS]});
        hostEnd.send({type : "view", view});
        clock.advance(0);
    };
    return {clock, client, hostEnd, port, received, view, welcome};
};

describe('a game client', () => {
    it('says hello, and has nothing until the host welcomes it', () => {
        const {clock, client, received} = setUp();
        expect(client.getSnapshot()).toEqual({status : "connecting", seats : null, view : null, refusal : null, talk : []});
        clock.advance(0);
        expect(received).toEqual([{type : "hello", protocol : PROTOCOL}]);
    });

    it('hears who sits where, then keeps the latest view, and tells its listeners', () => {
        const {client, view, welcome} = setUp();
        const listener = vi.fn();
        client.subscribe(listener);
        welcome();
        expect(client.getSnapshot()).toMatchObject({status : "open", seats : SEATS, view});
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('says when the host speaks another version, or hangs up', () => {
        const {clock, client, hostEnd} = setUp();
        hostEnd.send({type : "mismatch", protocol : PROTOCOL + 1});
        hostEnd.close();
        clock.advance(0);
        expect(client.getSnapshot().status).toBe("mismatch");

        const other = setUp();
        other.welcome();
        other.hostEnd.close();
        other.clock.advance(0);
        expect(other.client.getSnapshot().status).toBe("closed");
    });

    it('replaces the snapshot with each message, and numbers refusals', () => {
        const {clock, client, hostEnd, welcome} = setUp();
        welcome();
        const first = client.getSnapshot();
        const refused = {type : "refused", command : {type : "claim"}, error : "There's no discard for you to claim", code : "late"} as const;
        hostEnd.send(refused);
        hostEnd.send(refused);
        clock.advance(0);
        const after = client.getSnapshot();
        expect(after).not.toBe(first);
        expect(after.view).toBe(first.view);
        expect(after.refusal).toEqual({command : {type : "claim"}, error : "There's no discard for you to claim", code : "late", seq : 2});
    });

    it("keeps what's said this round, numbered, in words, with your name left out", () => {
        const {clock, client, hostEnd, welcome} = setUp();
        welcome();
        const blame = linesFor("clara", "dealBlame").find(line => line.text.startsWith("{dealer}, "))!;
        const down = linesFor("clara", "downSelf")[0];
        hostEnd.send({type : "said", seat : 1, line : {id : blame.id, to : 0}, round : 0, after : 0});
        hostEnd.send({type : "said", seat : 1, line : {id : down.id}, round : 0, after : 2});
        clock.advance(0);
        const [first, second] = client.getSnapshot().talk;
        expect(first).toMatchObject({seat : 1, line : {id : blame.id, to : 0}, round : 0, after : 0, seq : 1, big : false});
        expect(first.text).not.toMatch(/[{}]|Ann/);
        expect(first.text[0]).toBe(first.text[0].toUpperCase());
        expect(second).toMatchObject({seq : 2, text : down.text, big : true});

        // a new round starts afresh
        hostEnd.send({type : "said", seat : 1, line : {id : down.id}, round : 1, after : 3});
        clock.advance(0);
        expect(client.getSnapshot().talk).toMatchObject([{round : 1, seq : 3}]);
    });

    it('sends commands to the host', () => {
        const {clock, client, received} = setUp();
        client.send({type : "draw", from : "deck"});
        clock.advance(0);
        expect(received.at(-1)).toEqual({type : "command", command : {type : "draw", from : "deck"}});
    });

    it('stops telling a listener once it unsubscribes', () => {
        const {client, welcome} = setUp();
        const listener = vi.fn();
        client.subscribe(listener)();
        welcome();
        expect(listener).not.toHaveBeenCalled();
    });

    it('hangs up when closed', () => {
        const {clock, client, hostEnd, welcome} = setUp();
        welcome();
        client.close();
        expect(client.getSnapshot().status).toBe("closed");
        const closed = vi.fn();
        hostEnd.onClose(closed);
        clock.advance(0);
        expect(closed).toHaveBeenCalled();
    });
});
