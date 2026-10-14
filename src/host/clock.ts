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
