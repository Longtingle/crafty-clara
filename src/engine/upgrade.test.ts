// @vitest-environment node
import {apply, createGame, nextDeadline} from './game.ts';
import {STATE_VERSION, upgradeState} from './upgrade.ts';

const NAMES = ["Ann", "Bob", "Cat", "Dan"];

describe('upgradeState', () => {
    it('leaves a state from this version as it is, as a copy', () => {
        const state = createGame({names : NAMES, seed : 1, lookMs : 30_000});
        const upgraded = upgradeState(JSON.parse(JSON.stringify(state)));
        expect(upgraded).toEqual(state);
        expect(upgraded).not.toBe(state);
    });

    it('brings a game saved before versions up to date, as it played then', () => {
        // drawn from the deck, so a claim window is open, in a game saved
        // before the look time and the claim's showing time
        let result = apply(createGame({names : NAMES, seed : 1}), 0, {type : "draw", from : "deck"}, 0);
        if (!result.ok) throw new Error(result.error);
        const old = JSON.parse(JSON.stringify(result.state));
        for (let key of ["version", "claimShowMs", "lookMs", "look"]) delete old[key];
        delete old.claim.shownUntil;

        const upgraded = upgradeState(old)!;
        expect(upgraded).toMatchObject({version : STATE_VERSION, claimShowMs : 0, lookMs : 0, look : null, claim : {shownUntil : 0}});
        expect(nextDeadline(upgraded)).toBe(6000);
        // and it plays on
        expect(apply(upgraded, 1, {type : "claim"}, 10).ok).toBe(true);
    });

    it('gives up on something that isn’t a game, or a game from a newer version', () => {
        const state = createGame({names : NAMES, seed : 1});
        expect(upgradeState(null)).toBeNull();
        expect(upgradeState("game")).toBeNull();
        expect(upgradeState({seats : "four"})).toBeNull();
        expect(upgradeState({...state, version : STATE_VERSION + 1})).toBeNull();
        expect(upgradeState({...state, version : "2"})).toBeNull();
    });
});
