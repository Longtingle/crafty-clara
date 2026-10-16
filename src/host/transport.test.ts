// @vitest-environment node
import {createLocalPair} from './transport.ts';
import {createTestClock} from './testing.ts';

describe('a local pair', () => {
    it('delivers a copy of each message a moment later, never during send', () => {
        const clock = createTestClock();
        const [a, b] = createLocalPair<{n: number[]}, never>(clock);
        const received: {n: number[]}[] = [];
        b.listen(message => received.push(message));
        const sent = {n : [1]};
        a.send(sent);
        expect(received).toEqual([]);
        clock.advance(0);
        expect(received).toEqual([sent]);
        expect(received[0]).not.toBe(sent);
    });

    it('closes, from either end, after the messages already on their way, and then sends nothing more', () => {
        const clock = createTestClock();
        const [a, b] = createLocalPair<string, string>(clock);
        const received: string[] = [];
        b.listen(message => received.push(message));
        const closedA = vi.fn();
        const closedB = vi.fn();
        a.onClose(closedA);
        b.onClose(() => closedB(received.length));
        a.send("goodbye");
        a.close();
        a.send("too late");
        b.send("nor this");
        clock.advance(0);
        expect(received).toEqual(["goodbye"]);
        expect(closedA).toHaveBeenCalledTimes(1);
        // told it's closed once the goodbye had arrived
        expect(closedB).toHaveBeenCalledWith(1);
    });
});
