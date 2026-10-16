// A game against the bots in this page, kept as it goes: saved after every
// move, so it can be carried on another time, and added to your history
// when it ends. App loads this with the game screen, after the home screen.

import type {BotLevel} from './engine/levels.ts';
import type {CharacterId} from './engine/cast.ts';
import type {GameSpeed} from './host/game-speed.ts';
import {viewFor} from './engine/view.ts';
import {startLocalGame, type LocalGame, type LocalGameSave} from './host/local-game.ts';
import type {SeatInfo} from './host/protocol.ts';
import type {Clock} from './host/clock.ts';
import {createGameClient, type GameClient} from './client/game-client.ts';
import type {SavedGame} from './storage/saved-game.ts';
import type {HeardLines} from './storage/heard-lines.ts';
import {gameRecord, type GameHistory} from './storage/history.ts';

export interface Session {
    game: LocalGame;
    /** your seat's end: the screen hears who sits where from the host, as it would online */
    client: GameClient;
}

export interface SessionOptions {
    /** a new game against these characters, at these levels */
    cast?: CharacterId[];
    levels?: BotLevel[];
    seed?: number;
    /** how quickly the bots play, and how long you have to claim a discard */
    speed?: GameSpeed;
    /** or a saved game to carry on */
    from?: LocalGameSave;
    savedGame: SavedGame;
    history: GameHistory;
    /** the table talk heard lately: the bots keep off it, and this game's is added */
    heardLines?: HeardLines;
    heard?: string[];
    clock?: Clock;
}

export const startSession = ({cast, levels = [], seed, speed, from, savedGame, history, heardLines, heard, clock}: SessionOptions): Session => {
    let finished = false;
    const keep = (save: LocalGameSave): void => {
        if (save.state.phase !== "gameEnd") {
            savedGame.save(save);
        } else if (!finished) {
            finished = true;
            savedGame.save(null);
            let view = viewFor(save.state, 0, save.savedAt);
            let seats: SeatInfo[] = [{level : null, character : null}, ...save.bots.map(bot => ({level : bot.level, character : bot.character ?? null}))];
            void history.add(gameRecord(view, seats, Date.now()));
        }
    };
    let game = startLocalGame({name : "You", cast, levels, seed, speed, from, recentLines : heard, clock, onChange : keep});
    let client = createGameClient(game.port);
    // each line said is kept as heard
    let heardUpTo = 0;
    client.subscribe(() => {
        for (let said of client.getSnapshot().talk) {
            if (said.seq <= heardUpTo) continue;
            heardUpTo = said.seq;
            heardLines?.add(said.line.id);
        }
    });
    return {game, client};
};
