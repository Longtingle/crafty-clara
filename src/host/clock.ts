// Time, for the parts of a game that wait: the host's claim deadlines, the
// bots' pauses and the local transport. Tests use a clock they move on by
// hand (testing.ts), so a whole game plays out in no time.

export type TimerId = unknown;

export interface Clock {
    now(): number;
    setTimeout(callback: () => void, ms: number): TimerId;
    clearTimeout(timer: TimerId): void;
}

export const systemClock: Clock = {
    now : () => Date.now(),
    setTimeout : (callback, ms) => setTimeout(callback, ms),
    clearTimeout : timer => clearTimeout(timer as ReturnType<typeof setTimeout>)
};

/** A clock that can be paused: while it is, time stands still and no timer fires. */
export interface PausableClock extends Clock {
    pause(): void;
    resume(): void;
    isPaused(): boolean;
}

/**
 * Wraps a clock so a whole game can be paused. The host's claim deadlines,
 * the bots' pauses and the messages between them all wait on it, so while
 * it's paused nothing in the game moves. Time spent paused doesn't count:
 * a timer due 2 seconds after it was set still waits 2 seconds of unpaused time.
 */
export const createPausableClock = (base: Clock = systemClock): PausableClock => {
    // base time spent paused, and when the current pause began
    let pausedFor = 0;
    let pausedAt: number | null = null;
    let nextId = 1;
    let timers = new Map<number, {due: number; callback: () => void; base: TimerId | null}>();

    const now = (): number => (pausedAt ?? base.now()) - pausedFor;
    const start = (id: number): void => {
        let timer = timers.get(id)!;
        timer.base = base.setTimeout(() => {
            timers.delete(id);
            timer.callback();
        }, Math.max(0, timer.due - now()));
    };

    return {
        now,
        setTimeout(callback, ms) {
            let id = nextId++;
            timers.set(id, {due : now() + Math.max(0, ms), callback, base : null});
            if (pausedAt === null) start(id);
            return id;
        },
        clearTimeout(id) {
            let timer = timers.get(id as number);
            if (!timer) return;
            if (timer.base !== null) base.clearTimeout(timer.base);
            timers.delete(id as number);
        },
        pause() {
            if (pausedAt !== null) return;
            pausedAt = base.now();
            for (let timer of timers.values()) {
                if (timer.base !== null) base.clearTimeout(timer.base);
                timer.base = null;
            }
        },
        resume() {
            if (pausedAt === null) return;
            pausedFor += base.now() - pausedAt;
            pausedAt = null;
            for (let id of timers.keys()) start(id);
        },
        isPaused : () => pausedAt !== null
    };
};
