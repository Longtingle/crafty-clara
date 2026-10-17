import {render, act} from '@testing-library/react';
import type {LookView} from '@/engine/view.ts';
import {useLookClock, useLookLeft, type LookClock} from './screen-hooks.ts';

// The look clock lives in the screen, and the prompt reads it as it ticks.
const lookView = (startsIn: number): LookView => ({startsIn, total : 30_000, ready : [false, false]});

function Prompt({clock, look, seen}: {clock: LookClock; look: LookView; seen: number[]}) {
    seen.push(useLookLeft(clock, look));
    return null;
}

function Screen({look, held, seen}: {look: LookView; held: boolean; seen: number[]}) {
    let clock = useLookClock(look, held);
    return <Prompt clock={clock} look={look} seen={seen} />;
}

describe('the look clock', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("shows the view's time from the prompt's first render, never what the clock had before", () => {
        const seen: number[] = [];
        const {rerender} = render(<Screen look={lookView(30_000)} held={false} seen={seen} />);
        expect(seen[0]).toBe(30_000);
        // the next round's look time
        seen.length = 0;
        rerender(<Screen look={lookView(12_000)} held={false} seen={seen} />);
        expect(seen[0]).toBe(12_000);
        expect(seen.every(ms => ms > 11_000)).toBe(true);
    });

    it('counts down a second at a time, and stands still while the game is held', () => {
        vi.useFakeTimers({toFake : ["setTimeout", "clearTimeout", "performance"]});
        const seen: number[] = [];
        const look = lookView(30_000);
        const {rerender} = render(<Screen look={look} held={false} seen={seen} />);
        act(() => vi.advanceTimersByTime(3000));
        expect(seen.at(-1)).toBe(27_000);

        rerender(<Screen look={look} held seen={seen} />);
        act(() => vi.advanceTimersByTime(5000));
        expect(seen.at(-1)).toBe(27_000);

        rerender(<Screen look={look} held={false} seen={seen} />);
        act(() => vi.advanceTimersByTime(2000));
        expect(seen.at(-1)).toBe(25_000);
    });
});
