// A bot in a seat. It plays through a port like any other seat, seeing only
// the views the host sends it, and pauses before each move so a person can
// follow what it does. A bot that's one of the cast talks too (talk.ts).

import {NORMAL_BOT, botMove, type BotProfile} from '../engine/bot.ts';
import type {Command} from '../engine/game.ts';
import {answer, createTalker, hear, talkAbout, type Line} from '../engine/talk.ts';
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

/** How long a bot waits before it says something (ms): about a move, or in answer to a line it heard. */
export const TALK_PACE = {line : 900, answer : 1600};

/** After anyone says something, a bot keeps a passing remark to itself this long (ms). */
const QUIET_MS = 4000;

export interface BotOptions {
    /** its level and seed, and who it is; a normal bot by default */
    profile?: BotProfile;
    /** lines heard in games lately, which it keeps off while it has others to say */
    recentLines?: string[];
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
    recentLines,
    clock = systemClock,
    pace = BOT_PACE,
    onRefused = message => console.warn("A bot's move was refused:", message)
}: BotOptions = {}): (() => void) => {
    let view: GameView | null = null;
    let pause: TimerId | undefined;
    let talker = profile.character ? createTalker(profile.character, profile.seed, recentLines) : null;
    // when anyone last said something, and the line the bot's about to say
    let heardAt = -Infinity;
    let speaking: TimerId | undefined;

    const cancel = (): void => {
        if (pause !== undefined) clock.clearTimeout(pause);
        pause = undefined;
    };

    // A remark in passing keeps for another time if someone else has just
    // spoken. A big moment's line, or an answer, doesn't.
    const say = (line: Line, delay: number, answering: boolean): void => {
        let quiet = (): boolean => answering || line.big === true || clock.now() - heardAt >= QUIET_MS;
        if (speaking !== undefined || !quiet()) return;
        speaking = clock.setTimeout(() => {
            speaking = undefined;
            if (quiet()) port.send({type : "say", line});
        }, delay);
    };

    // The view may have changed during the pause, so decide again on the latest.
    const move = (): void => {
        pause = undefined;
        let command = view && botMove(view, profile);
        if (command) port.send({type : "command", command});
    };

    const stopListening = port.listen(message => {
        if (message.type === "said") {
            heardAt = clock.now();
            if (!talker) return;
            hear(talker, message.line);
            let reply = view && answer(message, view, talker);
            if (reply) say(reply, TALK_PACE.answer, true);
            return;
        }
        if (message.type === "refused") {
            // an answer can cross with the claim window closing, or a start
            // with play starting, which is no fault of the bot's
            let type = message.command.type;
            if (type !== "claim" && type !== "pass" && type !== "start") onRefused(message);
            return;
        }
        let before = view;
        view = message.view;
        let line = talker && talkAbout(before, view, talker);
        if (line) say(line, TALK_PACE.line, false);
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
        if (speaking !== undefined) clock.clearTimeout(speaking);
        stopListening();
    };
};
