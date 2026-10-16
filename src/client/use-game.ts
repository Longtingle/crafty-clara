import {useSyncExternalStore} from 'react';
import type {Command} from '../engine/game.ts';
import type {GameClient, GameSnapshot} from './game-client.ts';

export interface Game extends GameSnapshot {
    send(command: Command): void;
}

// The game as your seat sees it, kept up to date: {view, refusal, talk, send}.
// view is null until the host's first message arrives; refusal is the last
// command the host turned down ({command, error, seq}), if any; talk is
// what's been said at the table this round.
export function useGame(client: GameClient): Game {
    let {view, refusal, talk} = useSyncExternalStore(client.subscribe, client.getSnapshot);
    return {view, refusal, talk, send : client.send};
}
