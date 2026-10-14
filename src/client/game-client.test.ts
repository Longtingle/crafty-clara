// @vitest-environment node
import {createGame} from '../engine/game.ts';
import {viewFor} from '../engine/view.ts';
import {createLocalPair} from '../host/transport.ts';
import {createTestClock} from '../host/testing.ts';
import type {ClientMessage, HostMessage} from '../host/protocol.ts';
import {createGameClient} from './game-client.ts';

const setUp = () => {
    const clock = createTestClock();
    const [port, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
    const client = createGameClient(port);
    const received: ClientMessage[] = [];
    hostEnd.listen(message => received.push(message));
    const view = viewFor(createGame({names : ["Ann", "Bob"], seed : 1}), 0, 0);
    return {clock, client, hostEnd, received, view};
};

describe('a game client', () => {
    it('has no view until the host sends one', () => {
        expect(setUp().client.getSnapshot()).toEqual({view : null, refusal : null});
    });

    it('keeps the latest view, and tells its listeners', () => {
        const {clock, client, hostEnd, view} = setUp();
        const listener = vi.fn();
        client.subscribe(listener);
        hostEnd.send({type : "view", view});
        clock.advance(0);
        expect(client.getSnapshot().view).toEqual(view);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('replaces the snapshot with each message, and numbers refusals', () => {
        const {clock, client, hostEnd, view} = setUp();
        hostEnd.send({type : "view", view});
        clock.advance(0);
        const first = client.getSnapshot();
        const refused = {type : "refused", command : {type : "claim"}, error : "There's no discard for you to claim"} as const;
        hostEnd.send(refused);
        hostEnd.send(refused);
        clock.advance(0);
        const after = client.getSnapshot();
        expect(after).not.toBe(first);
        expect(after.view).toBe(first.view);
        expect(after.refusal).toEqual({command : {type : "claim"}, error : "There's no discard for you to claim", seq : 2});
    });

    it('sends commands to the host', () => {
        const {clock, client, received} = setUp();
        client.send({type : "draw", from : "deck"});
        clock.advance(0);
        expect(received).toEqual([{type : "command", command : {type : "draw", from : "deck"}}]);
    });

    it('stops telling a listener once it unsubscribes', () => {
        const {clock, client, hostEnd, view} = setUp();
        const listener = vi.fn();
        client.subscribe(listener)();
        hostEnd.send({type : "view", view});
        clock.advance(0);
        expect(listener).not.toHaveBeenCalled();
    });
});
