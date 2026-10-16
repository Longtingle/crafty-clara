import {render, screen, fireEvent, within, cleanup, waitFor} from '@testing-library/react';
import App from './App.tsx';

beforeEach(() => localStorage.clear());

// who you play, as if chosen last time
const playing = (cast: string[]) => localStorage.setItem("crafty-clara.cast", JSON.stringify(cast));

it('shows the home screen before a game starts', () => {
    render(<App />);
    expect(screen.getByRole('heading', {name : 'Crafty Clara'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name : 'Start game'})).toBeInTheDocument();
});

it('starts a game against three opponents, with you to play first', async () => {
    playing(["clara", "alan", "gemma"]);
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    fireEvent.click(await screen.findByRole('button', {name : 'Deal the cards'}));
    const hand = await screen.findByRole('group', {name : 'Your hand'});
    expect(within(hand).getAllByRole('button')).toHaveLength(12);
    const sort = screen.getByRole('group', {name : 'Sort hand'});
    expect(within(sort).getByRole('button', {pressed : true})).toHaveTextContent('By value');
    for (let name of ["Clara", "Alan", "Gemma"]) expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    expect(document.querySelector('img[src$="portraits/alan.webp"]')).not.toBeNull();
    // time to look over your hand first, until you're ready (the bots already are)
    expect(screen.getByText('Look over your hand')).toBeInTheDocument();
    expect(screen.getByText(/You start the round/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name : 'Ready'}));
    expect(await screen.findByText(/You start this round/)).toBeInTheDocument();
    // all normal: no opponent is tagged as hard
    expect(screen.queryAllByText('Hard')).toHaveLength(0);
});

it('picks three different opponents the first time, and keeps them', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    const opponents = await screen.findByRole('list', {name : 'Opponents'});
    const names = within(opponents).getAllByRole('group').map(group => group.getAttribute('aria-labelledby')).map(id => document.getElementById(id!)!.textContent);
    expect(new Set(names).size).toBe(3);

    cleanup();
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    for (let name of names) expect(await screen.findByRole('group', {name : name!})).toBeInTheDocument();
});

it('lets you change who you play, and remembers it', async () => {
    playing(["clara", "alan", "gemma"]);
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    fireEvent.click(await screen.findByRole('button', {name : 'Change Alan'}));
    const picker = await screen.findByRole('dialog', {name : 'Who plays opposite you?'});
    // the others at the table can't be picked twice
    expect(within(picker).getByRole('button', {name : /Clara/})).toBeDisabled();
    expect(within(picker).getByRole('button', {name : /Alan/})).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(picker).getByRole('button', {name : /Julie/}));
    expect(await screen.findByRole('group', {name : 'Julie'})).toBeInTheDocument();
    expect(screen.queryByRole('group', {name : 'Alan'})).not.toBeInTheDocument();

    cleanup();
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    expect(await screen.findByRole('group', {name : 'Julie'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name : 'Deal the cards'}));
    await screen.findByRole('group', {name : 'Your hand'});
    expect(screen.getAllByText('Julie').length).toBeGreaterThan(0);
});

it('lets you choose each opponent’s level, and remembers it', async () => {
    playing(["clara", "alan", "gemma"]);
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    const second = await screen.findByRole('group', {name : 'Alan'});
    expect(within(second).getByRole('button', {name : 'Normal'})).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(second).getByRole('button', {name : 'Hard'}));
    expect(within(second).getByRole('button', {name : 'Hard'})).toHaveAttribute('aria-pressed', 'true');

    // the choice stays for the next visit
    cleanup();
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    await waitFor(() => {
        expect(within(screen.getByRole('group', {name : 'Alan'})).getByRole('button', {name : 'Hard'})).toHaveAttribute('aria-pressed', 'true');
    });
    expect(within(screen.getByRole('group', {name : 'Clara'})).getByRole('button', {name : 'Normal'})).toHaveAttribute('aria-pressed', 'true');

    // and the game shows who's hard
    fireEvent.click(screen.getByRole('button', {name : 'Deal the cards'}));
    await screen.findByRole('group', {name : 'Your hand'});
    expect(screen.getAllByText('Hard').length).toBeGreaterThan(0);
});

it('offers to carry on a game from your last visit', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    fireEvent.click(await screen.findByRole('button', {name : 'Deal the cards'}));
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

it('goes back to the home screen from the choice of opponents', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    fireEvent.click(await screen.findByRole('button', {name : 'Back'}));
    expect(screen.getByRole('heading', {name : 'Crafty Clara'})).toBeInTheDocument();
});

it('pauses the game until you resume it', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    fireEvent.click(await screen.findByRole('button', {name : 'Deal the cards'}));
    await screen.findByRole('group', {name : 'Your hand'});
    fireEvent.click(screen.getByRole('button', {name : 'Pause'}));
    expect(await screen.findByRole('dialog', {name : 'Paused'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name : 'Resume'}));
    await waitFor(() => expect(screen.queryByRole('dialog', {name : 'Paused'})).not.toBeInTheDocument());
});

it('shows your stats, once you have some', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Your stats'}));
    expect(await screen.findByText('No finished games yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name : 'Back'}));

    // a game you won, on the lowest total
    const player = (name: string, level: string | null, scores: number[]) => ({name, level, scores, downs : scores.map(() => true)});
    localStorage.setItem("crafty-clara.history", JSON.stringify({version : 1, games : [{
        finishedAt : Date.now(),
        seat : 0,
        players : [player("You", null, [5, 10]), player("Opponent 1", "hard", [20, 0]), player("Opponent 2", "normal", [0, 30]), player("Opponent 3", "normal", [9, 9])],
        outs : [2, 1]
    }]}));
    fireEvent.click(screen.getByRole('button', {name : 'Your stats'}));
    expect(await screen.findByText('From the 1 game you’ve finished on this device')).toBeInTheDocument();
    expect(screen.getByText('next best 18')).toBeInTheDocument();
});

it('remembers how much table talk you want', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Settings'}));
    const dialog = await screen.findByRole('dialog', {name : 'Settings'});
    const chatty = within(dialog).getByRole('group', {name : 'Table talk'});
    expect(within(chatty).getByRole('button', {name : 'Chatty'})).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(chatty).getByRole('button', {name : 'Quiet'}));
    expect(within(chatty).getByRole('button', {name : 'Quiet'})).toHaveAttribute('aria-pressed', 'true');

    cleanup();
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Settings'}));
    const again = await screen.findByRole('dialog', {name : 'Settings'});
    await waitFor(() => expect(within(within(again).getByRole('group', {name : 'Table talk'})).getByRole('button', {name : 'Quiet'})).toHaveAttribute('aria-pressed', 'true'));
});

it('remembers how quickly you want the game to go', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Settings'}));
    const dialog = await screen.findByRole('dialog', {name : 'Settings'});
    const speed = within(dialog).getByRole('group', {name : 'Game speed'});
    expect(within(speed).getByRole('button', {name : 'Normal'})).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(speed).getByRole('button', {name : 'Relaxed'}));
    expect(within(dialog).getByText(/10 seconds to claim a discard/)).toBeInTheDocument();

    cleanup();
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Settings'}));
    const again = await screen.findByRole('dialog', {name : 'Settings'});
    await waitFor(() => expect(within(within(again).getByRole('group', {name : 'Game speed'})).getByRole('button', {name : 'Relaxed'})).toHaveAttribute('aria-pressed', 'true'));
});

it('remembers your hints', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Settings'}));
    const dialog = await screen.findByRole('dialog', {name : 'Settings'});
    fireEvent.click(within(dialog).getByRole('switch', {name : 'Cards that fit a meld'}));
    expect(within(dialog).getByRole('switch', {name : 'Cards that fit a meld'})).not.toBeChecked();

    cleanup();
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Settings'}));
    const again = await screen.findByRole('dialog', {name : 'Settings'});
    await waitFor(() => expect(within(again).getByRole('switch', {name : 'Cards that fit a meld'})).not.toBeChecked());
});
