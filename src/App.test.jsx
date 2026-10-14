import {render, screen, fireEvent} from '@testing-library/react';
import App from './App.jsx';

it('shows the home screen before a game starts', () => {
    render(<App />);
    expect(screen.getByRole('heading', {name : 'Crafty Clara'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name : 'Start game'})).toBeInTheDocument();
});

it('starts a game against three opponents, with you to play first', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', {name : 'Start game'}));
    expect(await screen.findByRole('group', {name : 'Your hand'})).toBeInTheDocument();
    expect(screen.getAllByRole('button', {pressed : false})).toHaveLength(12);
    for (let name of ["Opponent 1", "Opponent 2", "Opponent 3"]) expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    expect(screen.getByText(/You start this round/)).toBeInTheDocument();
});
