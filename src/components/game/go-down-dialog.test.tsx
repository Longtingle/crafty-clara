import {render, screen, fireEvent, within} from '@testing-library/react';
import {RUN, SET} from '@/engine/cards.ts';
import {cards} from '@/engine/testing.ts';
import {pretendShortScreen} from '@/lib/testing.ts';
import GoDownDialog from './go-down-dialog.tsx';

// round 1 (two sets), with both in hand
const SETS = cards("7C 7H 7D 9S 9H 9C 2D 4D");
// round 2 (a set and a run), the run J–K♥ with the A♦ at either end
const ACE = cards("5C 5S 5D 11H 12H 13H 1D 2S");

const open = (hand = SETS, requirement = {S : 2, R : 0}) => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<GoDownDialog open hand={hand} requirement={requirement} onCancel={onCancel} onSubmit={onSubmit} />);
    return {dialog : screen.getByRole('dialog', {name : 'Go down'}), onSubmit, onCancel};
};

const pick = (dialog: HTMLElement, name: string) => {
    const hand = within(dialog).getAllByRole('button', {name : new RegExp("^" + name)});
    fireEvent.click(hand[hand.length - 1]);
};

describe.each([
    ["on a wide screen", () => () => {}],
    ["on a phone held sideways", pretendShortScreen]
])('going down %s', (_, setUp) => {
    let restore: () => void;
    beforeEach(() => {
        restore = setUp();
    });
    afterEach(() => restore());

    it("fills each slot from your hand, says when it's ready, and goes down", () => {
        const {dialog, onSubmit} = open();
        const goDown = within(dialog).getAllByRole('button', {name : 'Go down'}).at(-1)!;
        expect(goDown).toBeDisabled();

        pick(dialog, "Seven of clubs");
        pick(dialog, "Seven of hearts");
        // the card that would finish the set says so
        expect(within(dialog).getByRole('button', {name : "Seven of diamonds, completes the set 1"})).toBeInTheDocument();
        pick(dialog, "Seven of diamonds");
        expect(within(dialog).getByText(/Set of 7s is ready/)).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name : 'Set 2'}));
        for (let name of ["Nine of spades", "Nine of hearts", "Nine of clubs"]) pick(dialog, name);
        expect(goDown).toBeEnabled();
        fireEvent.click(goDown);
        expect(onSubmit).toHaveBeenCalledWith([{type : SET, indices : [0, 1, 2]}, {type : SET, indices : [3, 4, 5]}]);
    });

    it('takes a card back out of a slot', () => {
        const {dialog} = open();
        pick(dialog, "Seven of clubs");
        fireEvent.click(within(dialog).getByRole('button', {name : "Take Seven of clubs out of the set 1"}));
        expect(within(dialog).queryByRole('button', {name : /^Take Seven of clubs/})).not.toBeInTheDocument();
    });

    it('lays a run out the way you choose, when a red ace could go at either end', () => {
        const {dialog, onSubmit} = open(ACE, {S : 1, R : 1});
        for (let name of ["Five of clubs", "Five of spades", "Five of diamonds"]) pick(dialog, name);
        fireEvent.click(within(dialog).getByRole('button', {name : 'Run'}));
        for (let name of ["Jack of hearts", "Queen of hearts", "King of hearts", "Ace of diamonds"]) pick(dialog, name);
        const layout = within(dialog).getByRole('group', {name : 'Lay the run out as'});
        fireEvent.click(within(layout).getByRole('button', {name : 'J–A ♥'}));
        fireEvent.click(within(dialog).getAllByRole('button', {name : 'Go down'}).at(-1)!);
        expect(onSubmit).toHaveBeenCalledWith([{type : SET, indices : [0, 1, 2]}, {type : RUN, indices : [3, 4, 5, 6], from : 11}]);
    });
});
