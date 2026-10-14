// @vitest-environment node
import {createPausableClock} from './clock.ts';
import {createTestClock} from './testing.ts';

describe('createPausableClock', () => {
    it('stands still while paused, and counts no paused time', () => {
        const base = createTestClock(1000);
        const clock = createPausableClock(base);
        base.advance(100);
        expect(clock.now()).toBe(1100);
        clock.pause();
        expect(clock.isPaused()).toBe(true);
        base.advance(5000);
        expect(clock.now()).toBe(1100);
        clock.resume();
        base.advance(50);
        expect(clock.now()).toBe(1150);
    });

    it('holds timers while paused, then runs them after the time they had left', () => {
        const base = createTestClock();
        const clock = createPausableClock(base);
        const fired: string[] = [];
        clock.setTimeout(() => fired.push("a"), 100);
        clock.setTimeout(() => fired.push("b"), 300);
        base.advance(60);
        clock.pause();
        // set while paused: waits from when the game resumes
        clock.setTimeout(() => fired.push("c"), 10);
        base.advance(10_000);
        expect(fired).toEqual([]);

        clock.resume();
        base.advance(10);
        expect(fired).toEqual(["c"]);
        base.advance(30);
        expect(fired).toEqual(["c", "a"]);
        base.advance(200);
        expect(fired).toEqual(["c", "a", "b"]);
    });

    it('cancels timers, paused or not', () => {
        const base = createTestClock();
        const clock = createPausableClock(base);
        const fired: string[] = [];
        const a = clock.setTimeout(() => fired.push("a"), 100);
        const b = clock.setTimeout(() => fired.push("b"), 100);
        clock.clearTimeout(a);
        clock.pause();
        clock.clearTimeout(b);
        clock.resume();
        base.runAll();
        expect(fired).toEqual([]);
    });
});
