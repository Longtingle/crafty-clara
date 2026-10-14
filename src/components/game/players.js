// Who sits where, from your point of view. Your opponents are numbered 1, 2,
// 3... in turn order after you, and each has a colour for their avatar and
// their entries in the activity log.
const AI_COLORS = ["#2f6f99", "#a0662a", "#7650ae", "#2f7f6f", "#9a4466"];

const YOU_COLOR = "#f4efe3";

const aiColor = (index) => AI_COLORS[index % AI_COLORS.length];

// The other seats, in turn order after yours.
const opponentSeats = (view) => {
    let count = view.seats.length;
    return Array.from({length : count - 1}, (_, i) => (view.seat + 1 + i) % count);
}

// 0 for the opponent who plays after you, 1 for the next, and so on.
const opponentIndex = (view, seat) => (seat - view.seat - 1 + view.seats.length) % view.seats.length;

const seatName = (view, seat) => (seat === view.seat) ? "You" : view.seats[seat].name;

const seatColor = (view, seat) => (seat === view.seat) ? YOU_COLOR : aiColor(opponentIndex(view, seat));

export {YOU_COLOR, aiColor, opponentSeats, opponentIndex, seatName, seatColor};
