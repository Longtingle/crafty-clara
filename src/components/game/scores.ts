import type {CharacterId} from '@/engine/cast.ts';
import type {GameView} from '@/engine/view.ts';
import {opponentSeats, opponentIndex, seatColor} from './players.ts';

/** One player's line on the Scoreboard. */
export interface ScoreRow {
    key: number;
    name: string;
    color: string;
    /** what their avatar says: "You", or their opponent number */
    label: string;
    /** whose portrait their avatar shows, if one of the cast */
    character: CharacterId | null;
    isYou: boolean;
    /** points for each round played */
    points: number[];
    total: number;
    wentOut: boolean;
}

// Rows for the Scoreboard, you first. With markWentOut, whoever went out this
// round is marked (nobody, if the deck ran out). characters are by seat.
export const scoreRows = (view: GameView, markWentOut = false, characters: (CharacterId | null)[] = []): ScoreRow[] => [view.seat, ...opponentSeats(view)].map(seat => {
    let player = view.seats[seat];
    let isYou = seat === view.seat;
    return {
        key : seat,
        name : isYou ? "You" : player.name,
        color : seatColor(view, seat),
        label : isYou ? "You" : String(opponentIndex(view, seat) + 1),
        character : characters[seat] ?? null,
        isYou,
        points : player.scores,
        total : player.total,
        wentOut : markWentOut && view.wentOut === seat
    };
});
