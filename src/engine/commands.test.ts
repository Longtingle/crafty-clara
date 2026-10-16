// @vitest-environment node
import {parseCommand} from './commands.ts';

describe('parseCommand', () => {
    it('accepts each command', () => {
        const commands = [
            {type : "draw", from : "deck"},
            {type : "draw", from : "discard"},
            {type : "claim"},
            {type : "pass"},
            {type : "start"},
            {type : "ready"},
            {type : "discard", card : "k3f9-17"},
            {type : "addToSetrun", card : "k3f9-17", target : {seat : 2, index : 0}},
            {type : "addToSetrun", card : "k3f9-17", target : {seat : 2, index : 1}, end : "high"},
            {type : "goDown", setruns : [{type : "SET", cards : ["a", "b", "c"]}, {type : "RUN", cards : ["d", "e", "f", "g"], from : 11}]}
        ];
        for (let command of commands) expect(parseCommand(command)).toEqual(command);
    });

    it('rebuilds a command from only the fields it has, so nothing made up gets into the game', () => {
        const parsed = parseCommand({type : "addToSetrun", card : "x-1", target : {seat : 0, index : 0, evil : true}, extra : "<b>"});
        expect(parsed).toEqual({type : "addToSetrun", card : "x-1", target : {seat : 0, index : 0}});
        expect(parseCommand({type : "claim", card : "x-1"})).toEqual({type : "claim"});
        expect(parseCommand({type : "goDown", setruns : [{type : "SET", cards : ["a", "b", "c"], note : 1}]}))
            .toEqual({type : "goDown", setruns : [{type : "SET", cards : ["a", "b", "c"]}]});
    });

    it('refuses anything that isn’t a command', () => {
        const nonsense = [
            null, undefined, 7, "draw", [], {},
            {type : "cheat"},
            // a draw from somewhere made up, which the log would show everyone
            {type : "draw", from : "Deck"},
            {type : "draw"},
            {type : "discard"},
            {type : "discard", card : 17},
            {type : "discard", card : "x".repeat(100)},
            {type : "addToSetrun", card : "x-1", target : {seat : "1", index : 0}},
            {type : "addToSetrun", card : "x-1", target : {seat : -1, index : 0}},
            {type : "addToSetrun", card : "x-1", target : {seat : 1, index : 0.5}},
            {type : "addToSetrun", card : "x-1", target : {seat : 1, index : 0}, end : "middle"},
            {type : "goDown", setruns : 7},
            {type : "goDown", setruns : [{type : "PAIR", cards : ["a", "b"]}]},
            {type : "goDown", setruns : [{type : "RUN", cards : "abcd"}]},
            {type : "goDown", setruns : [{type : "RUN", cards : ["a", "b", "c", "d"], from : 15}]},
            {type : "goDown", setruns : [{type : "RUN", cards : ["a", 2, "c", "d"]}]}
        ];
        for (let value of nonsense) expect(parseCommand(value), JSON.stringify(value)).toBeNull();
    });
});
