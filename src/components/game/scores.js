import {opponentSeats, opponentIndex, seatColor} from './players.js';

// Rows for the Scoreboard, you first. With markWentOut, whoever went out this
// round is marked (nobody, if the deck ran out).
const scoreRows = (view, markWentOut = false) => [view.seat, ...opponentSeats(view)].map(seat => {
    let player = view.seats[seat];
    let isYou = seat === view.seat;
    return {
        key : seat,
        name : isYou ? "You" : player.name,
        color : seatColor(view, seat),
        label : isYou ? "You" : opponentIndex(view, seat) + 1,
        isYou,
        points : player.scores,
        total : player.total,
        wentOut : markWentOut && view.wentOut === seat
    };
});

export {scoreRows};
