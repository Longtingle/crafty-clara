import {cleanup, render, screen, fireEvent, waitFor, within} from '@testing-library/react';
import {RUN} from '@/engine/cards.ts';
import {createGame} from '@/engine/game.ts';
import {checkSetrun} from '@/engine/setruns.ts';
import {cards} from '@/engine/testing.ts';
import {startLocalGame, type LocalGame} from '@/host/local-game.ts';
import {createGameClient} from '@/client/game-client.ts';
import {DEFAULT_HINTS} from '@/storage/settings.ts';
import GameScreen from './game-screen.tsx';

let game: LocalGame;
const pausing = {pause : vi.fn<() => void>(), resume : vi.fn<() => void>()};
const changeHints = vi.fn();

const leavePage = (hidden: boolean) => {
    Object.defineProperty(document, "hidden", {configurable : true, get : () => hidden});
    fireEvent(document, new Event("visibilitychange"));
};

// you play first in this deal, so the bots wait for you
beforeEach(async () => {
    game = startLocalGame({name : "You", seed : 1});
    render(
        <GameScreen
            client={createGameClient(game.port)}
            levels={[null, "normal", "normal", "normal"]}
            pausing={pausing}
            hints={DEFAULT_HINTS}
            onHintsChange={changeHints}
            games={async () => []}
            onNewGame={() => {}}
            onShowStats={() => {}}
        />
    );
    await screen.findByRole('group', {name : 'Your hand'});
    // the screen resumes the (unpaused) game as it starts
    vi.clearAllMocks();
});

afterEach(() => {
    game.stop();
    // back to the jsdom default
    Reflect.deleteProperty(document, "hidden");
});

it('gives you time to look over your hand, and starts play when you are ready', async () => {
    expect(screen.getByText('Look over your hand')).toBeInTheDocument();
    expect(screen.getByRole('button', {name : 'Go down'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button', {name : 'Ready'}));
    expect(await screen.findByText(/You start this round/)).toBeInTheDocument();
    expect(screen.queryByRole('button', {name : 'Ready'})).not.toBeInTheDocument();
});

it('pauses when you leave the page, until you resume', async () => {
    leavePage(true);
    expect(await screen.findByRole('dialog', {name : 'Paused'})).toBeInTheDocument();
    expect(pausing.pause).toHaveBeenCalledTimes(1);

    // coming back leaves it paused
    leavePage(false);
    expect(screen.getByRole('dialog', {name : 'Paused'})).toBeInTheDocument();
    expect(pausing.resume).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', {name : 'Resume'}));
    await waitFor(() => expect(screen.queryByRole('dialog', {name : 'Paused'})).not.toBeInTheDocument());
    expect(pausing.resume).toHaveBeenCalledTimes(1);
});

it('holds the game while the rules, the scores or the settings are open', async () => {
    for (let name of ['Rules', 'Scores', 'Settings']) {
        fireEvent.click(screen.getByRole('button', {name}));
        let dialog = await screen.findByRole('dialog');
        expect(pausing.pause).toHaveBeenCalledTimes(1);

        // leaving the page now changes nothing: the dialog is still there when you're back
        leavePage(true);
        leavePage(false);
        expect(screen.queryByRole('dialog', {name : 'Paused'})).not.toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name : 'Close'}));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(pausing.resume).toHaveBeenCalledTimes(1);
        vi.clearAllMocks();
    }
});

it('changes your hints from the settings', async () => {
    fireEvent.click(screen.getByRole('button', {name : 'Settings'}));
    const dialog = await screen.findByRole('dialog', {name : 'Settings'});
    expect(within(dialog).getByRole('switch', {name : 'Cards that fit a meld'})).toBeChecked();
    expect(within(dialog).getByRole('switch', {name : 'When you can go down'})).not.toBeChecked();
    fireEvent.click(within(dialog).getByRole('switch', {name : 'When you can go down'}));
    expect(changeHints).toHaveBeenCalledWith({fits : true, targets : true, ready : true});
});

it('asks which end of a run a red ace goes, and plays it there', async () => {
    // your turn, down with 9–K♥, holding the A♦
    const state = createGame({names : ["You", "Opponent 1", "Opponent 2", "Opponent 3"], seed : 1});
    const run = checkSetrun(cards("9H 10H 11H 12H 13H"), RUN);
    if (!run.valid) throw new Error("not a run");
    Object.assign(state, {phase : "play", turn : 0});
    Object.assign(state.seats[0], {hand : cards("1D 3S"), table : [run.setrun], isDown : true});
    const bots = [1, 2, 3].map(seed => ({level : "normal" as const, seed, risk : 0.5}));
    game.stop();
    cleanup();
    game = startLocalGame({name : "You", from : {state, bots, savedAt : 0}});
    render(
        <GameScreen
            client={createGameClient(game.port)}
            levels={[null, "normal", "normal", "normal"]}
            pausing={pausing}
            hints={DEFAULT_HINTS}
            onHintsChange={changeHints}
            games={async () => []}
            onNewGame={() => {}}
            onShowStats={() => {}}
        />
    );

    fireEvent.click(await screen.findByRole('button', {name : /^Ace of diamonds/}));
    fireEvent.click(screen.getByRole('button', {name : /^Run 9–K/}));
    const chooser = await screen.findByRole('dialog', {name : 'Where should the A♦ go?'});
    expect(within(chooser).getByRole('button', {name : /As the 8♥/})).toBeInTheDocument();
    fireEvent.click(within(chooser).getByRole('button', {name : /As the A♥/}));
    expect(await screen.findByRole('button', {name : /^Run 9–A/})).toBeInTheDocument();
});
