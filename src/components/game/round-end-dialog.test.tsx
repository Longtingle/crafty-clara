import {render, screen, fireEvent} from '@testing-library/react';
import {simulateGame} from '@/engine/simulate.ts';
import {viewFor} from '@/engine/view.ts';
import {gameRecord} from '@/storage/history.ts';
import RoundEndDialog from './round-end-dialog.tsx';

it('shows your record when the game ends, and offers your stats', () => {
    const {state} = simulateGame(5);
    const view = viewFor(state, 0, 0);
    const record = gameRecord(view, [null, "normal", "normal", "normal"], 1);
    const showStats = vi.fn();
    render(
        <RoundEndDialog
            view={view}
            record={[record, record]}
            onReady={() => {}}
            onNewGame={() => {}}
            onShowStats={showStats}
        />
    );
    const totals = view.seats.map(player => player.total);
    const won = totals.every(total => total >= totals[0]);
    const wins = won ? 2 : 0;
    expect(screen.getByText("Your record")).toBeInTheDocument();
    expect(screen.getByText(wins + " wins in 2 games · " + (won ? 100 : 0) + "%")).toBeInTheDocument();
    expect(screen.getByRole('img', {name : /^Where you finished, oldest first/})).toBeInTheDocument();
    expect(screen.getByRole('button', {name : 'New game'})).toHaveFocus();
    fireEvent.click(screen.getByRole('button', {name : 'Your stats'}));
    expect(showStats).toHaveBeenCalled();
});
