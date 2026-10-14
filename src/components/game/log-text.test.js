// @vitest-environment node
import {RUN, SET} from '@/engine/cards.ts';
import {checkSetrun} from '@/engine/setruns.ts';
import {card, cards} from '@/engine/testing.ts';
import {describeEntry, activityEntries, lastAction, newCardTag} from './log-text.js';

const setrun = (str, type) => checkSetrun(cards(str), type).setrun;

// A view from seat 0 of four, with a set on seat 1's table and a run on yours.
const viewWith = (log) => ({
    seat : 0,
    round : 2,
    seats : [
        {name : "You", table : [setrun("4S 5S 6S 7S", RUN)]},
        {name : "Opponent 1", table : [setrun("9C 9D 9H", SET)]},
        {name : "Opponent 2", table : []},
        {name : "Opponent 3", table : []}
    ],
    log
});

describe('describeEntry', () => {
    const view = viewWith([]);
    const says = (entry) => describeEntry(entry, view);

    it('names the card you drew, but not one an opponent drew', () => {
        expect(says({type : "draw", seat : 0, from : "deck", card : card("10H")})).toBe("drew 10♥ from the deck");
        expect(says({type : "draw", seat : 2, from : "deck", card : null})).toBe("drew from the deck");
        expect(says({type : "draw", seat : 2, from : "discard", card : card("3C")})).toBe("took 3♣ from the discard pile");
    });

    it('describes claims, discards, going down and going out', () => {
        expect(says({type : "claim", seat : 1, card : card("3C")})).toBe("claimed 3♣ out of turn");
        expect(says({type : "discard", seat : 1, card : card("12S")})).toBe("discarded Q♠");
        expect(says({type : "goDown", seat : 3})).toBe("went down");
        expect(says({type : "out", seat : 3})).toBe("went out");
    });

    it('says whose setrun a card went onto', () => {
        const add = (seat, target) => ({type : "add", seat, card : card("8S"), target : {seat : target, index : 0}, returnedAce : null});
        expect(says(add(1, 0))).toBe("added 8♠ to your run");
        expect(says(add(1, 1))).toBe("added 8♠ to their set");
        expect(says(add(0, 1))).toBe("added 8♠ to Opponent 1's set");
        expect(says({...add(0, 1), returnedAce : card("1H")})).toBe("added 8♠ to Opponent 1's set and took back the wild A♥");
    });
});

describe('activityEntries', () => {
    it('lists the round newest first, with names and unique ids', () => {
        const entries = activityEntries(viewWith([
            {type : "draw", seat : 1, from : "deck", card : null},
            {type : "discard", seat : 1, card : card("12S")}
        ]));
        expect(entries.map(({id, name, text}) => ({id, name, text}))).toEqual([
            {id : "2-1", name : "Opponent 1", text : "discarded Q♠"},
            {id : "2-0", name : "Opponent 1", text : "drew from the deck"}
        ]);
    });
});

describe('lastAction', () => {
    it("is a player's latest move this round", () => {
        const view = viewWith([{type : "goDown", seat : 2}, {type : "discard", seat : 2, card : card("12S")}]);
        expect(lastAction(view, 2)).toBe("discarded Q♠");
        expect(lastAction(view, 3)).toBeNull();
    });
});

describe('newCardTag', () => {
    it('tags the card you drew, claimed or got back, until you discard', () => {
        const drew = {type : "draw", seat : 0, from : "deck", card : card("10H", "a")};
        const claimed = {type : "claim", seat : 0, card : card("3C", "b")};
        const back = {type : "add", seat : 0, card : card("8S"), target : {seat : 1, index : 0}, returnedAce : card("1H", "c")};
        const discarded = {type : "discard", seat : 0, card : card("12S")};
        expect(newCardTag(viewWith([drew]))).toEqual({id : "a", label : "New"});
        expect(newCardTag(viewWith([drew, {type : "discard", seat : 1, card : card("2C")}]))).toEqual({id : "a", label : "New"});
        expect(newCardTag(viewWith([drew, discarded]))).toBeNull();
        expect(newCardTag(viewWith([drew, discarded, claimed]))).toEqual({id : "b", label : "Claimed"});
        expect(newCardTag(viewWith([drew, back]))).toEqual({id : "c", label : "Back"});
    });
});
