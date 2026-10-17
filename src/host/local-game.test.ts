// @vitest-environment node
import {ROUND_REQUIREMENTS} from '../engine/cards.ts';
import {character} from '../engine/cast.ts';
import type {Command} from '../engine/game.ts';
import {lineText} from '../engine/catalogue.ts';
import type {GameView} from '../engine/view.ts';
import {startBot} from './bot-player.ts';
import {LOOK_MS, startLocalGame, type LocalGameSave} from './local-game.ts';
import {createTestClock, type TestClock} from './testing.ts';
import {PROTOCOL, type SeatPort} from './protocol.ts';

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
            if (message.type !== "command" || !ignore.includes(message.command.type)) port.send(message);
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
        const game = startLocalGame({name : "You", seed : 7, levels : ["hard", "normal", "hard"], clock});
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
        // everyone, you included, was ready to start play at once
        expect(game.host.state()).toMatchObject({round : 1, phase : "draw", turn : 1});
    });

    it('gives you time to look over your hand, until you are ready or the time is up', () => {
        const clock = createTestClock();
        const game = startLocalGame({name : "You", seed : 7, clock});
        playAsYou(game.port, clock, ["start"]);
        clock.advance(0);
        // the bots are ready at once
        expect(game.host.state()).toMatchObject({phase : "look", look : {ready : [false, true, true, true]}});
        clock.advance(LOOK_MS - 1);
        expect(game.host.state().phase).toBe("look");
        clock.advance(1);
        expect(game.host.state()).toMatchObject({phase : "draw", look : null});

        const again = startLocalGame({name : "You", seed : 7, clock});
        again.port.send({type : "hello", protocol : PROTOCOL});
        again.port.send({type : "command", command : {type : "start"}});
        clock.advance(0);
        expect(again.host.state()).toMatchObject({phase : "draw", look : null});
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

    it('stands still while paused, and carries on when resumed', () => {
        const clock = createTestClock();
        const game = startLocalGame({name : "You", seed : 7, clock});
        playAsYou(game.port, clock);
        clock.advance(5000);
        game.pause();
        const paused = game.host.state();
        clock.advance(60_000);
        expect(game.host.state()).toBe(paused);

        game.resume();
        clock.advance(5000);
        expect(game.host.state()).not.toBe(paused);
        clock.runAll();
        expect(game.host.state().phase).toBe("gameEnd");
    });

    it('saves itself as it starts and after every change', () => {
        const clock = createTestClock();
        const saves: LocalGameSave[] = [];
        const game = startLocalGame({name : "You", seed : 7, levels : ["hard"], clock, onChange : save => saves.push(save)});
        expect(saves).toHaveLength(1);
        expect(saves[0].state).toBe(game.host.state());
        expect(saves[0].bots.map(bot => bot.level)).toEqual(["hard", "normal", "normal"]);

        playAsYou(game.port, clock);
        clock.advance(20_000);
        expect(saves.length).toBeGreaterThan(5);
        expect(saves.at(-1)).toMatchObject({state : game.host.state(), bots : saves[0].bots});
        expect(saves.at(-1)!.savedAt).toBeGreaterThan(saves[0].savedAt);
        // ready to be stored
        expect(JSON.parse(JSON.stringify(saves.at(-1)))).toEqual(saves.at(-1));
    });

    it('seats the characters you chose, each with their own name and appetite for risk', () => {
        const saves: LocalGameSave[] = [];
        const game = startLocalGame({name : "You", seed : 7, cast : ["clara", "steve", "vena"], levels : ["hard"], clock : createTestClock(), onChange : save => saves.push(save)});
        expect(game.host.state().seats.map(seat => seat.name)).toEqual(["You", "Clara", "Steve", "Vena"]);
        expect(game.seats.map(seat => seat.character)).toEqual([null, "clara", "steve", "vena"]);
        expect(game.seats.map(seat => seat.level)).toEqual([null, "hard", "normal", "normal"]);
        expect(saves[0].bots).toMatchObject([
            {level : "hard", character : "clara", risk : character("clara").risk},
            {level : "normal", character : "steve", risk : character("steve").risk},
            {level : "normal", character : "vena", risk : character("vena").risk}
        ]);
        game.stop();

        // carried on, they're still themselves
        const again = startLocalGame({name : "You", clock : createTestClock(), from : JSON.parse(JSON.stringify(saves[0]))});
        expect(again.seats.map(seat => seat.character)).toEqual([null, "clara", "steve", "vena"]);
        expect(again.host.state().seats.map(seat => seat.name)).toEqual(["You", "Clara", "Steve", "Vena"]);
        again.stop();

        // bots from before the cast aren't anyone in particular
        expect(startLocalGame({name : "You", clock : createTestClock()}).seats.map(seat => seat.character)).toEqual([null, null, null, null]);
    });

    it('has the cast talk as they play, each in their own words, and never you', () => {
        const clock = createTestClock();
        const game = startLocalGame({name : "You", seed : 3, cast : ["clara", "chris", "gemma"], clock});
        const said: {seat: number; id: string; text: string}[] = [];
        game.port.listen(message => {
            // as you hear it: your name left out
            if (message.type === "said") said.push({seat : message.seat, id : message.line.id, text : lineText(message.line, seat => (seat === 0) ? null : game.host.state().seats[seat].name)});
        });
        playAsYou(game.port, clock);
        clock.runAll();
        expect(game.host.state().phase).toBe("gameEnd");
        expect(said.length).toBeGreaterThan(20);
        for (let {seat, id, text} of said) {
            expect(seat).toBeGreaterThan(0);
            // their own lines, or the answer written for someone else's
            expect(id.startsWith(game.seats[seat].character + ".") || id.includes(".re.")).toBe(true);
            expect(text).not.toMatch(/[{}]/);
            expect(text).not.toMatch(/\bYou\b/);
        }
    });

    it('gives you longer to claim a discard at a slower speed, and changes speed mid-game', () => {
        const game = startLocalGame({name : "You", seed : 7, speed : "relaxed", clock : createTestClock()});
        expect(game.host.state().claimWindowMs).toBe(10_000);
        game.setSpeed("quick");
        expect(game.host.state().claimWindowMs).toBe(6000);
        game.stop();
        // normal by default
        expect(startLocalGame({name : "You", clock : createTestClock()}).host.state().claimWindowMs).toBe(8000);
    });

    it('carries on from a save to the end of the game', () => {
        const warn = vi.spyOn(console, "warn");
        const saves: LocalGameSave[] = [];
        const first = createTestClock();
        const before = startLocalGame({name : "You", seed : 7, clock : first, onChange : save => saves.push(save)});
        playAsYou(before.port, first);
        first.advance(30_000);
        before.stop();
        const saved: LocalGameSave = JSON.parse(JSON.stringify(saves.at(-1)));

        const clock = createTestClock(1_000_000);
        const game = startLocalGame({name : "Someone else", seed : 1, clock, from : saved});
        expect(game.host.state().seats).toEqual(saved.state.seats);
        const you = playAsYou(game.port, clock);
        clock.runAll();
        expect(game.host.state().phase).toBe("gameEnd");
        expect(you.refusals).toEqual([]);
        expect(warn).not.toHaveBeenCalled();
    });

    it('gives a saved claim window the time it had left', () => {
        const saves: LocalGameSave[] = [];
        const first = createTestClock();
        const before = startLocalGame({name : "You", seed : 7, clock : first, onChange : save => saves.push(save)});
        playAsYou(before.port, first, ["claim", "pass"]);
        first.advance(60_000);
        before.stop();
        const saved = saves.find(save => save.state.claim && save.state.claim.deadline > save.savedAt)!;
        const left = saved.state.claim!.deadline - saved.savedAt;

        const clock = createTestClock(1_000_000);
        // bots too slow to answer, so only the deadline closes it
        const pace = {draw : 1e9, answer : 1e9, move : 1e9, ready : 1e9};
        const game = startLocalGame({name : "You", clock, pace, from : saved});
        expect(game.host.state().claim!.deadline - clock.now()).toBe(left);
        clock.advance(left - 1);
        expect(game.host.state().claim).not.toBeNull();
        clock.advance(1);
        expect(game.host.state().claim).toBeNull();
    });

    it('gives a saved look at your hand the time it had left', () => {
        const saves: LocalGameSave[] = [];
        const first = createTestClock();
        const before = startLocalGame({name : "You", seed : 7, clock : first, onChange : save => saves.push(save)});
        first.advance(10_000);
        before.stop();
        const saved = saves.at(-1)!;
        expect(saved.state.phase).toBe("look");
        const left = saved.state.look!.deadline - saved.savedAt;

        const clock = createTestClock(1_000_000);
        const game = startLocalGame({name : "You", clock, from : saved});
        clock.advance(left - 1);
        expect(game.host.state().phase).toBe("look");
        clock.advance(1);
        expect(game.host.state().phase).toBe("draw");
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
