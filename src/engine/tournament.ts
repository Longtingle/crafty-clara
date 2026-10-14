// Plays bots against each other over many deals, to see whether a change
// makes a bot play better. Each deal is played once for each rotation of the
// lineup round the table, so every bot gets every seat and the same cards,
// which takes out most of the luck.

import {simulateGame, type Player} from './simulate.ts';

export interface Contestant {
    name: string;
    player: Player;
}

export interface TournamentOptions {
    /** who sits where in the first rotation; a contestant can fill several seats */
    lineup: Contestant[];
    /** how many deals to play, each once per rotation */
    deals: number;
    /** the first deal's seed; the others follow on from it */
    firstSeed?: number;
}

export interface Standing {
    name: string;
    /** how many seats this contestant played, over all the games */
    seats: number;
    /** final score per seat (lower is better) */
    meanScore: number;
    /** share of seats that won their game, with ties shared */
    winRate: number;
    /** share of rounds in which this contestant went out */
    wentOutRate: number;
    /**
     * Share of rounds in which this contestant got down (going out
     * included). The rest it was caught with a full hand, which usually
     * costs far more than anything else.
     */
    downRate: number;
    /** average points a round when it got down, and when it was caught (null if it never was) */
    pointsWhenDown: number | null;
    pointsWhenCaught: number | null;
}

export interface TournamentResult {
    games: number;
    /** games left out because a round ran on too long */
    stalled: number;
    standings: Standing[];
    /**
     * With two contestants: how many more points per game the first scored
     * than the second (negative means the first did better), averaged over
     * the deals, and the standard error of that average.
     */
    edge: {mean: number; standardError: number} | null;
}

const mean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

export const playTournament = ({lineup, deals, firstSeed = 1}: TournamentOptions): TournamentResult => {
    let seats = lineup.length;
    let names = [...new Set(lineup.map(contestant => contestant.name))];
    let tally = new Map(names.map(name => [name, {seats : 0, score : 0, wins : 0, rounds : 0, wentOut : 0, down : 0, pointsDown : 0, pointsCaught : 0}]));
    let edges: number[] = [];
    let games = 0;
    let stalled = 0;

    for (let deal = 0; deal < deals; deal++) {
        let dealEdges: number[] = [];
        for (let rotation = 0; rotation < seats; rotation++) {
            let table = lineup.map((_, seat) => lineup[(seat + rotation) % seats]);
            let result = simulateGame(firstSeed + deal, {seats, players : table.map(contestant => contestant.player)});
            games++;
            if (result.stalled) {
                stalled++;
                continue;
            }
            let totals = result.state.seats.map(player => player.scores.reduce((sum, score) => sum + score, 0));
            let best = Math.min(...totals);
            let winners = totals.filter(total => total === best).length;
            table.forEach((contestant, seat) => {
                let entry = tally.get(contestant.name)!;
                entry.seats++;
                entry.score += totals[seat];
                if (totals[seat] === best) entry.wins += 1 / winners;
                entry.rounds += result.wentOut.length;
                entry.wentOut += result.wentOut.filter(out => out === seat).length;
                result.down.forEach((downs, round) => {
                    let points = result.state.seats[seat].scores[round];
                    if (downs[seat]) {
                        entry.down++;
                        entry.pointsDown += points;
                    } else {
                        entry.pointsCaught += points;
                    }
                });
            });
            if (names.length === 2) {
                let scoreOf = (name: string) => mean(totals.filter((_, seat) => table[seat].name === name));
                dealEdges.push(scoreOf(names[0]) - scoreOf(names[1]));
            }
        }
        if (dealEdges.length > 0) edges.push(mean(dealEdges));
    }

    let edge = null;
    if (edges.length > 1) {
        let average = mean(edges);
        let variance = edges.reduce((sum, value) => sum + (value - average) ** 2, 0) / (edges.length - 1);
        edge = {mean : average, standardError : Math.sqrt(variance / edges.length)};
    }
    return {
        games,
        stalled,
        standings : names.map(name => {
            let entry = tally.get(name)!;
            return {
                name,
                seats : entry.seats,
                meanScore : entry.score / entry.seats,
                winRate : entry.wins / entry.seats,
                wentOutRate : entry.wentOut / entry.rounds,
                downRate : entry.down / entry.rounds,
                pointsWhenDown : (entry.down > 0) ? entry.pointsDown / entry.down : null,
                pointsWhenCaught : (entry.rounds > entry.down) ? entry.pointsCaught / (entry.rounds - entry.down) : null
            };
        }),
        edge
    };
};
