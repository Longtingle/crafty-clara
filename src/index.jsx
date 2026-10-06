import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

import {Provider} from 'react-redux';
import {legacy_createStore as createStore, applyMiddleware} from 'redux';
import reducer from './store/reducer.js';

const logger = store => next => action => {
    console.log('dispatching', action)
    let result = next(action)
    console.log('next state', store.getState())
    return result
}

const store = import.meta.env.DEV
    ? createStore(reducer, applyMiddleware(logger))
    : createStore(reducer);

createRoot(document.getElementById('root')).render(
  <Provider store = {store} >
    <App />
  </Provider>
);
