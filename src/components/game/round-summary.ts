// What the round-end dialog says about the round, or the game, just ended:
// with no React, so it's tested on its own.

import type {GameView} from '@/engine/view.ts';
import {opponentSeats} from './players.ts';
import type {ScoreRow} from './scores.ts';

export interface RoundSummary {
    /** "Round 2 of 7 complete", or "Game over" */
    eyebrow: string;
    /** who went out, or who won the game */
    title: string;
    /** where you stand: in the lead, or how far behind or ahead of whom */
    standing: string;
    /** the others not yet ready for the next round, by name */
    waitingFor: string[];
}

/** For a view of a round just ended (or the game), with its score rows, you first (scoreRows). */
export const roundSummary = (view: GameView, rows: ScoreRow[]): RoundSummary => {
    let isFinalRound = view.phase === "gameEnd";
    // the ranking puts you first among equals
    let [leader, runnerUp] = [...rows].sort((a, b) => a.total - b.total);
    let you = rows[0];
    let wentOut = rows.find(row => row.wentOut);

    let title;
    if (isFinalRound) {
        title = leader.isYou ? "You win!" : leader.name + " wins";
    } else if (wentOut) {
        title = wentOut.isYou ? "You went out!" : wentOut.name + " went out";
    } else {
        title = "The deck ran out";
    }

    let standing;
    if (!isFinalRound) {
        standing = (you.total === leader.total)
            ? "You're in the lead."
            : "You're " + (you.total - leader.total) + " points behind " + leader.name + ".";
    } else if (!leader.isYou) {
        standing = "You finished " + (you.total - leader.total) + " points behind " + leader.name + ".";
    } else if (runnerUp.total === you.total) {
        standing = "You tied with " + runnerUp.name + " for the lowest total.";
    } else {
        standing = "You finished " + (runnerUp.total - you.total) + " points ahead of " + runnerUp.name + ".";
    }

    return {
        eyebrow : isFinalRound ? "Game over" : "Round " + (view.round + 1) + " of " + view.rounds + " complete",
        title,
        standing,
        waitingFor : opponentSeats(view).filter(seat => !view.seats[seat].ready).map(seat => view.seats[seat].name)
    };
};
