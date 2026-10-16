// What the game keeps between visits, in the storage of wherever it's
// running. On the web that's the browser's. An app build would give these
// the phone's own storage here, and a game online would keep its saves and
// history on the server, with the screens none the wiser.

import {browserStore} from './store.ts';
import {createSavedGame} from './saved-game.ts';
import {createGameHistory} from './history.ts';
import {createSettings} from './settings.ts';
import {createHeardLines} from './heard-lines.ts';

const store = browserStore();

export const savedGame = createSavedGame(store);
export const gameHistory = createGameHistory(store);
export const settings = createSettings(store);
export const heardLines = createHeardLines(store);
