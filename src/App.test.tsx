import {render, screen, fireEvent, within, cleanup, waitFor} from '@testing-library/react';
import App from './App.tsx';

beforeEach(() => localStorage.clear());

it('shows the home screen before a game starts', () => {
    render(<App />);
    expect(screen.getByRole('heading', {name : 'Crafty Clara'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name : 'Start game'})).toBeInTheDocument();
});

it('starts a game against three opponents, with you to play first', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    fireEvent.click(screen.getByRole('button', {name : 'Deal the cards'}));
    const hand = await screen.findByRole('group', {name : 'Your hand'});
    expect(within(hand).getAllByRole('button')).toHaveLength(12);
    const sort = screen.getByRole('group', {name : 'Sort hand'});
    expect(within(sort).getByRole('button', {pressed : true})).toHaveTextContent('By value');
    for (let name of ["Opponent 1", "Opponent 2", "Opponent 3"]) expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    expect(screen.getByText(/You start this round/)).toBeInTheDocument();
    // all normal: no opponent is tagged as hard
    expect(screen.queryAllByText('Hard')).toHaveLength(0);
});

it('lets you choose each opponent’s level, and remembers it', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    const second = screen.getByRole('group', {name : 'Opponent 2'});
    expect(within(second).getByRole('button', {name : 'Normal'})).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(second).getByRole('button', {name : 'Hard'}));
    expect(within(second).getByRole('button', {name : 'Hard'})).toHaveAttribute('aria-pressed', 'true');

    // the choice stays for the next visit
    cleanup();
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    await waitFor(() => {
        expect(within(screen.getByRole('group', {name : 'Opponent 2'})).getByRole('button', {name : 'Hard'})).toHaveAttribute('aria-pressed', 'true');
    });
    expect(within(screen.getByRole('group', {name : 'Opponent 1'})).getByRole('button', {name : 'Normal'})).toHaveAttribute('aria-pressed', 'true');

    // and the game shows who's hard
    fireEvent.click(screen.getByRole('button', {name : 'Deal the cards'}));
    await screen.findByRole('group', {name : 'Your hand'});
    expect(screen.getAllByText('Hard').length).toBeGreaterThan(0);
});

it('offers to carry on a game from your last visit', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    fireEvent.click(screen.getByRole('button', {name : 'Deal the cards'}));
    const cards = async () => within(await screen.findByRole('group', {name : 'Your hand'}))
        .getAllByRole('button')
        .map(card => card.getAttribute('aria-label'))
        .toSorted();
    const dealt = await cards();

    // the page is closed, and opened again
    cleanup();
    render(<App />);
    fireEvent.click(await screen.findByRole('button', {name : /Continue game · Round 1 of 7/}));
    expect(await cards()).toEqual(dealt);
});

it('goes back to the home screen from the choice of opponents', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    fireEvent.click(screen.getByRole('button', {name : 'Back'}));
    expect(screen.getByRole('heading', {name : 'Crafty Clara'})).toBeInTheDocument();
});

it('pauses the game until you resume it', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    fireEvent.click(screen.getByRole('button', {name : 'Deal the cards'}));
    await screen.findByRole('group', {name : 'Your hand'});
    fireEvent.click(screen.getByRole('button', {name : 'Pause'}));
    expect(await screen.findByRole('dialog', {name : 'Paused'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name : 'Resume'}));
    await waitFor(() => expect(screen.queryByRole('dialog', {name : 'Paused'})).not.toBeInTheDocument());
});
