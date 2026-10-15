// A game against the bots in this page, kept as it goes: saved after every
// move, so it can be carried on another time, and added to your history
// when it ends. App loads this with the game screen, after the home screen.

import type {BotLevel} from './engine/bot.ts';
import {viewFor} from './engine/view.ts';
import {startLocalGame, type LocalGame, type LocalGameSave} from './host/local-game.ts';
import type {Clock} from './host/clock.ts';
import {createGameClient, type GameClient} from './client/game-client.ts';
import type {SavedGame} from './storage/saved-game.ts';
import {gameRecord, type GameHistory} from './storage/history.ts';

export interface Session {
    game: LocalGame;
    client: GameClient;
    /** each seat's bot level, by seat (null for you) */
    levels: (BotLevel | null)[];
}

export interface SessionOptions {
    /** a new game against bots of these levels */
    levels?: BotLevel[];
    seed?: number;
    /** or a saved game to carry on */
    from?: LocalGameSave;
    savedGame: SavedGame;
    history: GameHistory;
    clock?: Clock;
}

export const startSession = ({levels = [], seed, from, savedGame, history, clock}: SessionOptions): Session => {
    let finished = false;
    const keep = (save: LocalGameSave): void => {
        if (save.state.phase !== "gameEnd") {
            savedGame.save(save);
        } else if (!finished) {
            finished = true;
            savedGame.save(null);
            let view = viewFor(save.state, 0, save.savedAt);
            void history.add(gameRecord(view, [null, ...save.bots.map(bot => bot.level)], Date.now()));
        }
    };
    let game = startLocalGame({name : "You", levels, seed, from, clock, onChange : keep});
    return {game, client : createGameClient(game.port), levels : [null, ...game.levels]};
};
