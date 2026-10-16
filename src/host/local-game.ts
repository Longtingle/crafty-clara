// A game in this page: you in seat 0, bots in the other seats, and the host
// between you, all talking through local ports as they would over a network.

import type {BotProfile} from '../engine/bot.ts';
import type {BotLevel} from '../engine/levels.ts';
import {character, type CharacterId} from '../engine/cast.ts';
import type {GameState} from '../engine/game.ts';
import {random} from '../engine/random.ts';
import {createPausableClock, systemClock, type Clock} from './clock.ts';
import {createHost, type Host} from './host.ts';
import {startBot, type BotPace} from './bot-player.ts';
import {DEFAULT_SPEED, GAME_SPEEDS, type GameSpeed} from './game-speed.ts';
import {createLocalPair} from './transport.ts';
import type {ClientMessage, HostMessage, SeatPort} from './protocol.ts';

export interface LocalGameOptions {
    /** your name */
    name: string;
    /** a bot plays in a seat for each name */
    opponents?: string[];
    /** or for each character, who plays as themselves (in place of opponents) */
    cast?: CharacterId[];
    /** each bot's level, in the same order; normal for any not given */
    levels?: BotLevel[];
    /** deals the same cards, and makes the bots play the same way, every time */
    seed?: number;
    /** how quickly the bots play, and how long you have to claim a discard (normal by default) */
    speed?: GameSpeed;
    /** in place of the speed's */
    claimWindowMs?: number;
    /** in place of the speed's */
    claimShowMs?: number;
    /** how long you have to look over your hand at the start of each round (ms) */
    lookMs?: number;
    clock?: Clock;
    /** in place of the speed's */
    pace?: BotPace;
    /** a saved game to carry on, in place of a new one with the options above */
    from?: LocalGameSave;
    /** lines of table talk heard in games lately, which the bots keep off */
    recentLines?: string[];
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
    /** who each bot is, by seat after yours: null for one that isn't a character */
    characters: (CharacterId | null)[];
    /** Plays faster or slower from now on: the bots' pauses, and the claim windows still to come. */
    setSpeed(speed: GameSpeed): void;
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
        claim : state.claim && {...state.claim, deadline : later(state.claim.deadline), shownUntil : later(state.claim.shownUntil ?? 0)},
        look : state.look && {...state.look, deadline : later(state.look.deadline)}
    };
};

export const startLocalGame = ({
    name,
    opponents = ["Opponent 1", "Opponent 2", "Opponent 3"],
    cast,
    levels = [],
    seed,
    speed = DEFAULT_SPEED,
    claimWindowMs,
    claimShowMs,
    lookMs = LOOK_MS,
    clock : baseClock = systemClock,
    pace,
    from,
    recentLines,
    onChange
}: LocalGameOptions): LocalGame => {
    let clock = createPausableClock(baseClock);
    let botPace = pace ?? GAME_SPEEDS[speed].pace;
    let claimWindow = claimWindowMs ?? GAME_SPEEDS[speed].claimWindowMs;
    let claimShow = claimShowMs ?? GAME_SPEEDS[speed].claimShowMs;
    // Each bot's seed decides what it forgets and when it takes a risk, if
    // it's a hard bot. A character's risk is their own; any other bot's is
    // secret and lasts the game.
    let seeded = {rng : seed ?? Math.floor(Math.random() * 2 ** 32)};
    let profiles: BotProfile[] = from?.bots ?? (cast ?? opponents).map((_, i) => {
        let profile = {level : levels[i] ?? "normal", seed : Math.floor(random(seeded) * 2 ** 32), risk : random(seeded)};
        return cast ? {...profile, risk : character(cast[i]).risk, character : cast[i]} : profile;
    });
    let names = from ? from.state.seats.slice(1).map(seat => seat.name) : (cast ? cast.map(id => character(id).name) : opponents);
    const save = (state: GameState) => onChange?.({state, bots : profiles, savedAt : clock.now()});

    let host = createHost({
        names : [name, ...names],
        seed,
        claimWindowMs : claimWindow,
        claimShowMs : claimShow,
        lookMs,
        clock,
        // a game carried on goes at today's speed
        state : from && {...carryOn(from, clock.now()), claimWindowMs : claimWindow, claimShowMs : claimShow},
        onChange : save
    });
    save(host.state());
    const seat = (index: number): SeatPort => {
        let [seatEnd, hostEnd] = createLocalPair<ClientMessage, HostMessage>(clock);
        host.connect(index, hostEnd);
        return seatEnd;
    };
    let port = seat(0);
    let bots = profiles.map((profile, i) => startBot(seat(i + 1), {profile, recentLines, clock, pace : () => botPace}));
    return {
        port,
        host,
        levels : profiles.map(profile => profile.level),
        characters : profiles.map(profile => profile.character ?? null),
        setSpeed(next) {
            botPace = GAME_SPEEDS[next].pace;
            host.setClaimTimes(GAME_SPEEDS[next].claimWindowMs, GAME_SPEEDS[next].claimShowMs);
        },
        pause : () => clock.pause(),
        resume : () => clock.resume(),
        stop() {
            bots.forEach(stop => stop());
            host.close();
        }
    };
};
