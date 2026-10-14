// A game in this page: you in seat 0, bots in the other seats, and the host
// between you, all talking through local ports as they would over a network.

import type {BotLevel} from '../engine/bot.ts';
import {random} from '../engine/random.ts';
import {createPausableClock, systemClock, type Clock} from './clock.ts';
import {createHost, type Host} from './host.ts';
import {startBot, type BotPace} from './bot-player.ts';
import {createLocalPair} from './transport.ts';
import type {ClientMessage, HostMessage, SeatPort} from './protocol.ts';

export interface LocalGameOptions {
    /** your name */
    name: string;
    /** a bot plays in a seat for each name */
    opponents?: string[];
    /** each bot's level, in the same order; normal for any not given */
    levels?: BotLevel[];
    /** deals the same cards, and makes the bots play the same way, every time */
    seed?: number;
    claimWindowMs?: number;
    clock?: Clock;
    pace?: BotPace;
}

export interface LocalGame {
    /** your end of the connection: send commands on it, and listen for your views */
    port: SeatPort;
    host: Host;
    /**
     * Pauses the whole game: the host, the bots and the messages between you
     * all wait on one clock, which stops. Claim windows keep the time they
     * had left. In a game with other people, pausing will need their say.
     */
    pause(): void;
    resume(): void;
    /** Ends the game: stops the bots and the host. */
    stop(): void;
}

export const startLocalGame = ({
    name,
    opponents = ["Opponent 1", "Opponent 2", "Opponent 3"],
    levels = [],
    seed,
    claimWindowMs,
    clock : baseClock = systemClock,
    pace
}: LocalGameOptions): LocalGame => {
    let clock = createPausableClock(baseClock);
    let host = createHost({names : [name, ...opponents], seed, claimWindowMs, clock});
    const seat = (index: number): SeatPort => {
        let [seatEnd, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
        host.connect(index, hostEnd);
        return seatEnd;
    };
    let port = seat(0);
    // each bot's seed decides what it forgets and when it takes a risk, if
    // it's a hard bot, and its risk is secret and lasts the game
    let seeded = {rng : seed ?? Math.floor(Math.random() * 2 ** 32)};
    let bots = opponents.map((_, i) => {
        let profile = {level : levels[i] ?? "normal", seed : Math.floor(random(seeded) * 2 ** 32), risk : random(seeded)};
        return startBot(seat(i + 1), {profile, clock, pace});
    });
    return {
        port,
        host,
        pause : () => clock.pause(),
        resume : () => clock.resume(),
        stop() {
            bots.forEach(stop => stop());
            host.close();
        }
    };
};
