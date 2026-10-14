// @vitest-environment node
import {ROUND_REQUIREMENTS} from '../engine/cards.ts';
import type {Command} from '../engine/game.ts';
import type {GameView} from '../engine/view.ts';
import {startBot} from './bot-player.ts';
import {startLocalGame} from './local-game.ts';
import {createTestClock, type TestClock} from './testing.ts';
import type {SeatPort} from './protocol.ts';

// Plays your seat with a bot that never sends the ignored commands: like
// someone who lets claim windows run out, or who doesn't click "Next round".
const playAsYou = (port: SeatPort, clock: TestClock, ignore: Command["type"][] = []) => {
    const views: GameView[] = [];
    const refusals: string[] = [];
    port.listen(message => {
        if (message.type === "view") views.push(message.view);
    });
    const filtered: SeatPort = {
        ...port,
        send : message => {
            if (!ignore.includes(message.command.type)) port.send(message);
        }
    };
    startBot(filtered, {clock, onRefused : message => refusals.push(message.error)});
    return {views, refusals};
};

describe('a local game', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('plays out to the end, with the claim windows you ignore closing at their deadline', () => {
        const warn = vi.spyOn(console, "warn");
        const clock = createTestClock();
        const game = startLocalGame({name : "You", seed : 7, clock});
        const you = playAsYou(game.port, clock, ["claim", "pass"]);
        clock.runAll();

        const state = game.host.state();
        expect(state.phase).toBe("gameEnd");
        expect(state.seats.map(seat => seat.name)).toEqual(["You", "Opponent 1", "Opponent 2", "Opponent 3"]);
        expect(state.seats.map(seat => seat.scores.length)).toEqual(state.seats.map(() => ROUND_REQUIREMENTS.length));
        expect(you.views.at(-1)?.phase).toBe("gameEnd");
        expect(you.views.some(view => view.claim?.canAnswer)).toBe(true);
        expect(you.refusals).toEqual([]);
        expect(warn).not.toHaveBeenCalled();
    });

    it('waits for you before dealing the next round', () => {
        const clock = createTestClock();
        const game = startLocalGame({name : "You", seed : 7, clock});
        playAsYou(game.port, clock, ["ready"]);
        clock.runAll();
        expect(game.host.state()).toMatchObject({round : 0, phase : "roundEnd"});
        expect(game.host.state().seats.map(seat => seat.ready)).toEqual([false, true, true, true]);

        game.port.send({type : "command", command : {type : "ready"}});
        clock.advance(0);
        expect(game.host.state()).toMatchObject({round : 1, phase : "draw", turn : 1});
    });

    it('replays exactly from the same seed', () => {
        const finish = (seed: number) => {
            const clock = createTestClock();
            const game = startLocalGame({name : "You", seed, clock});
            playAsYou(game.port, clock);
            clock.runAll();
            return {state : game.host.state(), time : clock.now()};
        };
        expect(finish(3)).toEqual(finish(3));
    });

    it('stops where it stands', () => {
        const clock = createTestClock();
        const game = startLocalGame({name : "You", seed : 7, clock});
        playAsYou(game.port, clock);
        clock.advance(5000);
        game.stop();
        const stopped = game.host.state();
        clock.runAll();
        expect(game.host.state()).toBe(stopped);
    });
});
