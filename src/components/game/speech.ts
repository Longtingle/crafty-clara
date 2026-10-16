// What the opponents are saying, as the table shows it in speech bubbles.

/** What an opponent is saying. */
export interface Bubble {
    /** new for each line, so each pops up afresh */
    key: number;
    text: string;
}

/**
 * What each seat is saying now (useSpeech). It's kept outside React state,
 * and each bubble listens for its own seat, so a line said re-renders only
 * the bubble it shows in.
 */
export interface Speech {
    /** what a seat is saying now, if anything: the same object until it changes */
    at(seat: number): Bubble | null;
    subscribe(listener: () => void): () => void;
}

/** Nobody saying anything. */
export const SILENCE: Speech = {at : () => null, subscribe : () => () => {}};
