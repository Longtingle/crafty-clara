import {render, screen, fireEvent, waitFor, within} from '@testing-library/react';
import {startLocalGame, type LocalGame} from '@/host/local-game.ts';
import {createGameClient} from '@/client/game-client.ts';
import GameScreen from './game-screen.tsx';

let game: LocalGame;
const pausing = {pause : vi.fn<() => void>(), resume : vi.fn<() => void>()};

const leavePage = (hidden: boolean) => {
    Object.defineProperty(document, "hidden", {configurable : true, get : () => hidden});
    fireEvent(document, new Event("visibilitychange"));
};

// you play first in this deal, so the bots wait for you
beforeEach(async () => {
    game = startLocalGame({name : "You", seed : 1});
    render(<GameScreen client={createGameClient(game.port)} levels={[null, "normal", "normal", "normal"]} pausing={pausing} onNewGame={() => {}} />);
    await screen.findByRole('group', {name : 'Your hand'});
    // the screen resumes the (unpaused) game as it starts
    vi.clearAllMocks();
});

afterEach(() => {
    game.stop();
    // back to the jsdom default
    Reflect.deleteProperty(document, "hidden");
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

it('holds the game while the rules or the scores are open', async () => {
    for (let name of ['Rules', 'Scores']) {
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
