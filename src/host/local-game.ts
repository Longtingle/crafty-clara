// A game in this page: you in seat 0, bots in the other seats, and the host
// between you, all talking through local ports as they would over a network.

import type {BotLevel, BotProfile} from '../engine/bot.ts';
import type {GameState} from '../engine/game.ts';
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
    /** how long you have to look over your hand at the start of each round (ms) */
    lookMs?: number;
    clock?: Clock;
    pace?: BotPace;
    /** a saved game to carry on, in place of a new one with the options above */
    from?: LocalGameSave;
    /** given the game as it starts and after every change, to save it */
    onChange?: (save: LocalGameSave) => void;
}

/** Everything needed to carry on a game later. It's JSON-safe, to be stored. */
export interface LocalGameSave {
    state: GameState;
    /** each bot's profile, by seat after yours */
    bots: BotProfile[];
    /** the game's time when it was saved, so a deadline keeps the time it had left */
    savedAt: number;
}

export interface LocalGame {
    /** your end of the connection: send commands on it, and listen for your views */
    port: SeatPort;
    host: Host;
    /** each bot's level, by seat after yours */
    levels: BotLevel[];
    /**
     * Pauses the whole game: the host, the bots and the messages between you
     * all wait on one clock, which stops. Claim windows, and the time to
     * look over your hand, keep the time they had left. In a game with other
     * people, pausing will need their say.
     */
    pause(): void;
    resume(): void;
    /** Ends the game: stops the bots and the host. */
    stop(): void;
}

/** How long you have to look over your hand at the start of each round (ms). */
export const LOOK_MS = 30_000;

// A saved deadline (a claim window's, or play starting) is a time on the
// clock of the game that saved it. On this game's clock, it keeps the time it
// had left.
const carryOn = ({state, savedAt}: LocalGameSave, now: number): GameState => {
    let later = (deadline: number) => now + Math.max(0, deadline - savedAt);
    return {
        ...state,
        claim : state.claim && {...state.claim, deadline : later(state.claim.deadline)},
        look : state.look && {...state.look, deadline : later(state.look.deadline)}
    };
};

export const startLocalGame = ({
    name,
    opponents = ["Opponent 1", "Opponent 2", "Opponent 3"],
    levels = [],
    seed,
    claimWindowMs,
    lookMs = LOOK_MS,
    clock : baseClock = systemClock,
    pace,
    from,
    onChange
}: LocalGameOptions): LocalGame => {
    let clock = createPausableClock(baseClock);
    // each bot's seed decides what it forgets and when it takes a risk, if
    // it's a hard bot, and its risk is secret and lasts the game
    let seeded = {rng : seed ?? Math.floor(Math.random() * 2 ** 32)};
    let profiles = from?.bots ?? opponents.map((_, i) => ({
        level : levels[i] ?? "normal",
        seed : Math.floor(random(seeded) * 2 ** 32),
        risk : random(seeded)
    }));
    const save = (state: GameState) => onChange?.({state, bots : profiles, savedAt : clock.now()});

    let host = createHost({
        names : [name, ...opponents],
        seed,
        claimWindowMs,
        lookMs,
        clock,
        state : from && carryOn(from, clock.now()),
        onChange : save
    });
    save(host.state());
    const seat = (index: number): SeatPort => {
        let [seatEnd, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
        host.connect(index, hostEnd);
        return seatEnd;
    };
    let port = seat(0);
    let bots = profiles.map((profile, i) => startBot(seat(i + 1), {profile, clock, pace}));
    return {
        port,
        host,
        levels : profiles.map(profile => profile.level),
        pause : () => clock.pause(),
        resume : () => clock.resume(),
        stop() {
            bots.forEach(stop => stop());
            host.close();
        }
    };
};
