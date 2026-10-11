import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore } from 'redux';
import reducer from './store/reducer.js';
import App from './App.jsx';

it('shows the home screen before a game starts', () => {
    render(
        <Provider store = {createStore(reducer)}>
            <App />
        </Provider>
    );
    expect(screen.getByRole('heading', {name : 'Crafty Clara'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name : 'Start game'})).toBeInTheDocument();
});
