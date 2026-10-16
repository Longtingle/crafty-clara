import type {CharacterId} from '@/engine/cast.ts';
import type {GameView} from '@/engine/view.ts';

// Who sits where, from your point of view. Your opponents are numbered 1, 2,
// 3... in turn order after you, and each has a colour for their avatar and
// their entries in the activity log. A character has a portrait too, facing
// right, into the table.
const AI_COLORS = ["#2f6f99", "#a0662a", "#7650ae", "#2f7f6f", "#9a4466"];

const YOU_COLOR = "#f4efe3";

const aiColor = (index: number): string => AI_COLORS[index % AI_COLORS.length];

// The other seats, in turn order after yours.
const opponentSeats = (view: GameView): number[] => {
    let count = view.seats.length;
    return Array.from({length : count - 1}, (_, i) => (view.seat + 1 + i) % count);
}

// 0 for the opponent who plays after you, 1 for the next, and so on.
const opponentIndex = (view: GameView, seat: number): number => (seat - view.seat - 1 + view.seats.length) % view.seats.length;

const seatName = (view: GameView, seat: number): string => (seat === view.seat) ? "You" : view.seats[seat].name;

const seatColor = (view: GameView, seat: number): string => (seat === view.seat) ? YOU_COLOR : aiColor(opponentIndex(view, seat));

const portraitImage = (id: CharacterId): string => import.meta.env.BASE_URL + "img/portraits/" + id + ".webp";

/** A place in a grid, from 0. */
export interface GridPlace {
    row: number;
    column: number;
}

// Where each player's melds go on a phone: in a grid two rows high, you at the
// bottom left, nearest your hand, and the others going round clockwise in turn
// order, the way they'd sit at a table. With four players, opponent 1 is at
// the top left, 2 at the top right and 3 at the bottom right. Every player
// keeps their place all game, down or not. Places are for you first, then
// your opponents in turn order (opponentSeats).
const seatPlaces = (count: number): {columns: number; places: GridPlace[]} => {
    let columns = Math.max(1, Math.ceil(count / 2));
    // up the left side, along the top, then back along the bottom
    let round: GridPlace[] = [
        {row : 1, column : 0},
        ...Array.from({length : columns}, (_, column) => ({row : 0, column})),
        ...Array.from({length : columns - 1}, (_, i) => ({row : 1, column : columns - 1 - i}))
    ];
    return {columns, places : round.slice(0, count)};
}

// What an opponent's seat means, before a game, for the opponent at `index`
// (from 0, in turn order after you) of those `names`. Where an opponent sits
// matters: the player after you sees your discards first, and the player
// before you comes ahead of you for every claim.
const seatNote = (index: number, names: string[]): string => {
    if (index === 0) return "Plays straight after you, so gets your discards first";
    if (index === names.length - 1) return "Plays just before you, so beats you to claims";
    return (names.length === 3) ? "Plays opposite you" : "Plays after " + names[index - 1];
};

// The question when choosing who sits in an opponent's seat.
const seatQuestion = (index: number, names: string[]): string => {
    if (index === 0) return "Who plays straight after you?";
    if (index === names.length - 1) return "Who plays just before you?";
    return (names.length === 3) ? "Who plays opposite you?" : "Who plays after " + names[index - 1] + "?";
};

export {YOU_COLOR, aiColor, opponentSeats, opponentIndex, seatName, seatColor, portraitImage, seatPlaces, seatNote, seatQuestion};
