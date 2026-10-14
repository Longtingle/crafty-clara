// On a phone, your hand fans out in an arch along the bottom edge of the
// screen, showing only the top of each card. Each card leans out from the
// middle and sits a little lower towards the ends.
//
// The lean and the drop are capped, so however many cards you hold, every
// card's corner (its value and suit, the top quarter of the card) stays above
// the edge of the screen. --hand-show (index.css) shows enough of each card
// for that, even at the ends of a long hand.

/** The most a card leans, at the ends of a long hand (degrees). */
export const MAX_TILT = 8;
/** The most the end cards drop below the middle ones (px). */
export const MAX_DROP = 16;

export interface ArchPlace {
    /** how far the card leans, clockwise (degrees) */
    angle: number;
    /** how far below the middle cards it sits (px) */
    drop: number;
}

const round = (x: number): number => Math.round(x * 10) / 10 + 0;

/** Where the card at index sits in an arch of count cards. */
export const archPlace = (index: number, count: number): ArchPlace => {
    let half = Math.max(1, (count - 1) / 2);
    // from -1 at the left end to 1 at the right
    let along = (index - (count - 1) / 2) / half;
    // a short hand curves gently; a long one reaches the caps at its ends
    let tilt = Math.min(MAX_TILT, half * 2.4);
    let drop = Math.min(MAX_DROP, half * 4);
    return {angle : round(tilt * along), drop : round(drop * along * along)};
};
