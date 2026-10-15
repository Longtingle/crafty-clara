// A bot in a seat. It plays through a port like any other seat, seeing only
// the views the host sends it, and pauses before each move so a person can
// follow what it does.

import {NORMAL_BOT, botMove, type BotProfile} from '../engine/bot.ts';
import type {Command} from '../engine/game.ts';
import type {GameView} from '../engine/view.ts';
import {systemClock, type Clock, type TimerId} from './clock.ts';
import type {RefusedMessage, SeatPort} from './protocol.ts';

/** How long a bot pauses before each kind of move (ms). */
export interface BotPace {
    /** before drawing, as its turn comes round */
    draw: number;
    /** before claiming or passing on a discard */
    answer: number;
    /** before going down, before each card it adds to a setrun, and before its discard */
    move: number;
    /** before saying it's ready to start play, or for the next round */
    ready: number;
}

export const BOT_PACE: BotPace = {draw : 1000, answer : 1000, move : 800, ready : 0};

export interface BotOptions {
    /** its level and seed; a normal bot by default */
    profile?: BotProfile;
    clock?: Clock;
    pace?: BotPace;
    /**
     * Told when the host refuses one of the bot's moves, which means the bot
     * has a bug. A claim or pass that arrives after the window has closed,
     * or a start after play has started, isn't reported.
     */
    onRefused?: (message: RefusedMessage) => void;
}

const pauseFor = (pace: BotPace, command: Command): number => {
    switch (command.type) {
        case "draw": return pace.draw;
        case "claim":
        case "pass": return pace.answer;
        case "start":
        case "ready": return pace.ready;
        default: return pace.move;
    }
};

/** Plays the seat at this end of the port. Returns a function that stops the bot. */
export const startBot = (port: SeatPort, {
    profile = NORMAL_BOT,
    clock = systemClock,
    pace = BOT_PACE,
    onRefused = message => console.warn("A bot's move was refused:", message)
}: BotOptions = {}): (() => void) => {
    let view: GameView | null = null;
    let pause: TimerId | undefined;

    const cancel = (): void => {
        if (pause !== undefined) clock.clearTimeout(pause);
        pause = undefined;
    };

    // The view may have changed during the pause, so decide again on the latest.
    const move = (): void => {
        pause = undefined;
        let command = view && botMove(view, profile);
        if (command) port.send({type : "command", command});
    };

    const stopListening = port.listen(message => {
        if (message.type === "refused") {
            // an answer can cross with the claim window closing, or a start
            // with play starting, which is no fault of the bot's
            let type = message.command.type;
            if (type !== "claim" && type !== "pass" && type !== "start") onRefused(message);
            return;
        }
        view = message.view;
        let command = botMove(view, profile);
        if (!command) {
            cancel();
        } else if (pause === undefined) {
            // A pause already under way carries on. Otherwise a stream of views
            // (someone else adding cards while the bot weighs up a claim) would
            // keep putting its move off.
            pause = clock.setTimeout(move, pauseFor(pace, command));
        }
    });

    return () => {
        cancel();
        stopListening();
    };
};
