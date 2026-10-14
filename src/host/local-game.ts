// A game in this page: you in seat 0, bots in the other seats, and the host
// between you, all talking through local ports as they would over a network.

import {systemClock, type Clock} from './clock.ts';
import {createHost, type Host} from './host.ts';
import {startBot, type BotPace} from './bot-player.ts';
import {createLocalPair} from './transport.ts';
import type {ClientMessage, HostMessage, SeatPort} from './protocol.ts';

export interface LocalGameOptions {
    /** your name */
    name: string;
    /** a bot plays in a seat for each name */
    opponents?: string[];
    seed?: number;
    claimWindowMs?: number;
    clock?: Clock;
    pace?: BotPace;
}

export interface LocalGame {
    /** your end of the connection: send commands on it, and listen for your views */
    port: SeatPort;
    host: Host;
    /** Ends the game: stops the bots and the host. */
    stop(): void;
}

export const startLocalGame = ({
    name,
    opponents = ["Opponent 1", "Opponent 2", "Opponent 3"],
    seed,
    claimWindowMs,
    clock = systemClock,
    pace
}: LocalGameOptions): LocalGame => {
    let host = createHost({names : [name, ...opponents], seed, claimWindowMs, clock});
    const seat = (index: number): SeatPort => {
        let [seatEnd, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
        host.connect(index, hostEnd);
        return seatEnd;
    };
    let port = seat(0);
    let bots = opponents.map((_, i) => startBot(seat(i + 1), {clock, pace}));
    return {
        port,
        host,
        stop() {
            bots.forEach(stop => stop());
            host.close();
        }
    };
};
