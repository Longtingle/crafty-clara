// A clock for tests that only moves when told to, so timers run in a known
// order and a whole game can play out in no time.

import type {Clock} from './clock.ts';

export interface TestClock extends Clock {
    /** Moves time on by ms, running every timer that comes due, in order. */
    advance(ms: number): void;
    /** Runs timers until there are none left, moving time on to each. */
    runAll(): void;
}

export const createTestClock = (start = 0): TestClock => {
    let time = start;
    let nextId = 1;
    let timers = new Map<number, {at: number; callback: () => void}>();

    // the timer due soonest, up to `until`; of timers due together, the one set first
    const due = (until: number): number | null => {
        let found: number | null = null;
        for (let [id, timer] of timers) {
            if (timer.at <= until && (found === null || timer.at < timers.get(found)!.at)) found = id;
        }
        return found;
    };

    const fire = (id: number): void => {
        let timer = timers.get(id)!;
        timers.delete(id);
        time = Math.max(time, timer.at);
        timer.callback();
    };

    return {
        now : () => time,
        setTimeout(callback, ms) {
            timers.set(nextId, {at : time + Math.max(0, ms), callback});
            return nextId++;
        },
        clearTimeout(id) {
            timers.delete(id as number);
        },
        advance(ms) {
            let end = time + ms;
            for (let id = due(end); id !== null; id = due(end)) fire(id);
            time = end;
        },
        runAll() {
            for (let count = 0, id = due(Infinity); id !== null; count++, id = due(Infinity)) {
                if (count > 1_000_000) throw new Error("The timers never ran out");
                fire(id);
            }
        }
    };
};
