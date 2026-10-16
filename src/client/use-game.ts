import {useSyncExternalStore} from 'react';
import type {Command} from '../engine/game.ts';
import type {GameClient, GameSnapshot} from './game-client.ts';

export interface Game extends GameSnapshot {
    send(command: Command): void;
}

// The game as your seat sees it, kept up to date: {status, seats, view,
// refusal, talk, send}. status says whether you're connected; seats is who
// sits where, once you're welcomed; view is null until the host's first view
// arrives; refusal is the last command the host turned down ({command,
// error, code, seq}), if any; talk is what's been said at the table this
// round.
export function useGame(client: GameClient): Game {
    let snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot);
    return {...snapshot, send : client.send};
}
