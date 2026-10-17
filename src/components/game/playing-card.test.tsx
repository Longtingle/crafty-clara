import {render, act} from '@testing-library/react';
import {LazyMotion, domMax} from 'motion/react';
import {MovingCard} from './playing-card.tsx';

// A card flying between two places, each giving its cards a layoutDependency
// (as the hand and the piles do). jsdom has no layout, so each place gives
// its elements a box of its own.

let restore: () => void;
beforeEach(() => {
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
        const x = (this.closest("[data-place]")?.getAttribute("data-place") === "pile") ? 500 : 0;
        return {x, y : 0, left : x, top : 0, right : x + 50, bottom : 80, width : 50, height : 80, toJSON() {}} as DOMRect;
    };
    restore = () => { Element.prototype.getBoundingClientRect = original; };
});
afterEach(() => restore());

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function Table({where, handDep, pileDep, onFly}: {where: "hand" | "pile"; handDep: string; pileDep: string; onFly: () => void}) {
    return (
        <LazyMotion features={domMax} strict>
            <div data-place="hand">
                {where === "hand" && <MovingCard key="X" id="X" layoutDependency={handDep}><span>card</span></MovingCard>}
            </div>
            <div data-place="pile">
                {where === "pile" && <MovingCard key="X" id="X" layoutDependency={pileDep} onLayoutAnimationStart={onFly}><span>card</span></MovingCard>}
            </div>
        </LazyMotion>
    );
}

// Whether the card flies from the hand to the pile.
const flies = async (handDep: string, pileDep: string): Promise<boolean> => {
    const onFly = vi.fn();
    const {rerender, unmount} = render(<Table where="hand" handDep={handDep} pileDep={pileDep} onFly={onFly} />);
    await act(() => wait(50));
    rerender(<Table where="pile" handDep={handDep} pileDep={pileDep} onFly={onFly} />);
    await act(() => wait(100));
    unmount();
    return onFly.mock.calls.length > 0;
};

it('flies your last card to the discard pile, each place naming its own dependency', async () => {
    expect(await flies("hand:X", "discard:X")).toBe(true);
});

it("doesn't fly a card between places whose dependencies are equal, which is why each place names its own", async () => {
    expect(await flies("X", "X")).toBe(false);
});
