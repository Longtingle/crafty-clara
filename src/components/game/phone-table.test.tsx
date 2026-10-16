import {render, screen, fireEvent, waitFor, within} from '@testing-library/react';
import {simulateGame} from '@/engine/simulate.ts';
import {viewFor} from '@/engine/view.ts';
import {startLocalGame, type LocalGame} from '@/host/local-game.ts';
import {createGameClient} from '@/client/game-client.ts';
import {pretendShortScreen} from '@/lib/testing.ts';
import {DEFAULT_PREFERENCES} from '@/storage/settings.ts';
import GameScreen from './game-screen.tsx';
import RoundEndDialog from './round-end-dialog.tsx';

// The layouts for a phone held sideways, which jsdom never shows on its own.

let restore: () => void;
beforeEach(() => {
    restore = pretendShortScreen();
});
afterEach(() => restore());

describe('the table', () => {
    let game: LocalGame;
    const changePrefs = vi.fn();

    // you play first in this deal, so the bots wait for you
    beforeEach(async () => {
        game = startLocalGame({name : "You", seed : 1, levels : ["normal", "hard", "normal"]});
        render(
            <GameScreen
                client={createGameClient(game.port)}
                pausing={{pause() {}, resume() {}}}
                prefs={DEFAULT_PREFERENCES}
                onPrefsChange={changePrefs}
                games={async () => []}
                onNewGame={() => {}}
                onShowStats={() => {}}
            />
        );
        await screen.findByRole('group', {name : 'Your hand'});
        vi.clearAllMocks();
    });
    afterEach(() => game.stop());

    it('has everyone in the top bar, a place for each player’s melds, and your hand along the bottom', () => {
        const opponents = screen.getByRole('list', {name : 'Opponents'});
        expect(within(opponents).getAllByRole('listitem')).toHaveLength(3);
        expect(screen.getByRole('group', {name : 'Your melds'})).toBeInTheDocument();
        for (let name of ["Opponent 1", "Opponent 2", "Opponent 3"]) {
            expect(within(screen.getByRole('group', {name : name + "'s melds"})).getByText("Not down yet")).toBeInTheDocument();
        }
        expect(within(screen.getByRole('group', {name : 'Your hand'})).getAllByRole('button')).toHaveLength(12);
        expect(screen.getByRole('button', {name : /^Hand sorted by value/})).toBeInTheDocument();
    });

    it('gives you time to look over your hand, and starts play when you are ready', async () => {
        fireEvent.click(screen.getByRole('button', {name : 'Ready'}));
        // the status line says what you can do, once the bots are ready too
        await waitFor(() => expect(screen.getAllByRole('status').map(status => status.textContent).join()).toMatch(/draw/i), {timeout : 3000});
        expect(screen.queryByRole('button', {name : 'Ready'})).not.toBeInTheDocument();
    });

    it('keeps the game’s buttons in a menu, with the settings as a sheet', async () => {
        fireEvent.keyDown(screen.getByRole('button', {name : 'Menu'}), {key : 'Enter'});
        const menu = await screen.findByRole('menu');
        for (let name of ['Pause', 'Scores', 'Rules']) expect(within(menu).getByRole('menuitem', {name})).toBeInTheDocument();
        fireEvent.click(within(menu).getByRole('menuitem', {name : 'Settings'}));

        const dialog = await screen.findByRole('dialog', {name : 'Settings'});
        fireEvent.click(within(dialog).getByRole('switch', {name : 'When you can go down'}));
        expect(changePrefs).toHaveBeenCalledWith({hints : {fits : true, targets : true, ready : true}});
    });
});

it('shows the end of the game with a compact scoreboard', () => {
    const {state} = simulateGame(5);
    const view = viewFor(state, 0, 0);
    render(<RoundEndDialog view={view} record={null} onReady={() => {}} onNewGame={() => {}} onShowStats={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByRole('row').length).toBeGreaterThan(4);
    expect(within(dialog).getByRole('button', {name : 'New game'})).toHaveFocus();
});
