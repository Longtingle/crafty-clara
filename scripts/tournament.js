// Plays bots against each other and prints how each did, to check whether a
// change makes a bot play better. Each deal is played once for every
// rotation of the lineup, so every bot gets every seat. For example:
//
//   npm run tournament -- --deals 200 --lineup hard,normal,normal,normal
//
// It runs the engine's TypeScript directly, so it needs Node 22.12 or later.

import {parseArgs} from 'node:util';
import {botMove} from '../src/engine/bot.ts';
import {playTournament} from '../src/engine/tournament.ts';

const BOTS = {
    normal : view => botMove(view),
    hard : view => botMove(view, {level : "hard", seed : 1})
};

const {values} = parseArgs({options : {
    deals : {type : "string", default : "100"},
    lineup : {type : "string", default : "hard,normal,normal,normal"},
    seed : {type : "string", default : "1"}
}});

const lineup = values.lineup.split(",").map(name => {
    if (!(name in BOTS)) throw new Error("No bot called " + name + ". Try one of: " + Object.keys(BOTS).join(", "));
    return {name, player : BOTS[name]};
});
const deals = Number(values.deals);

const started = performance.now();
const result = playTournament({lineup, deals, firstSeed : Number(values.seed)});
const seconds = (performance.now() - started) / 1000;

const percent = value => (value * 100).toFixed(1) + "%";
const points = value => (value === null) ? "–" : Number(value.toFixed(1));
console.log(`${deals} deals × ${lineup.length} rotations = ${result.games} games` +
    ` (${result.stalled} stalled) in ${seconds.toFixed(0)}s\n`);
console.table(Object.fromEntries(result.standings.map(standing => [standing.name, {
    "seats" : standing.seats,
    "score per game" : Number(standing.meanScore.toFixed(1)),
    "wins" : percent(standing.winRate),
    "went out" : percent(standing.wentOutRate),
    "got down" : percent(standing.downRate),
    "pts when down" : points(standing.pointsWhenDown),
    "pts when caught" : points(standing.pointsWhenCaught)
}])));
console.log("Points are per round. Getting down includes going out; caught means the round ended before it got down.");

if (result.edge) {
    const [first, second] = result.standings.map(standing => standing.name);
    const {mean, standardError} = result.edge;
    console.log(`\n${first} scored ${Math.abs(mean).toFixed(1)} points a game ${(mean < 0) ? "fewer" : "more"} than ${second}` +
        ` (± ${standardError.toFixed(1)}, one standard error).`);
}
