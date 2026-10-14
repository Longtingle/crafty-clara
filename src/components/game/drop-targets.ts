// Where a card from your hand can be dropped, as dnd-kit droppable ids. Cards
// in the hand are droppable too (to reorder it), under their own card ids,
// which never contain a colon.

import {createContext} from 'react';

/**
 * The card just played by dropping it on a pile or a meld, while its move is
 * on its way to the host. It stays where it was dropped meanwhile, so it
 * doesn't jump back into the hand before it flies to its new place.
 */
export const PlayedCard = createContext<string | null>(null);

export type DropTarget =
    | {kind: "hand"}
    | {kind: "deck"}
    | {kind: "discard"}
    | {kind: "meld"; seat: number; index: number};

export const HAND_AREA = "area:hand";
export const DECK_PILE = "pile:deck";
export const DISCARD_PILE = "pile:discard";

export const meldTarget = (seat: number, index: number): string => "meld:" + seat + ":" + index;

/** The target a droppable id names, or null for a card in the hand. */
export const parseTarget = (id: string | number): DropTarget | null => {
    let text = String(id);
    if (text === HAND_AREA) return {kind : "hand"};
    if (text === DECK_PILE) return {kind : "deck"};
    if (text === DISCARD_PILE) return {kind : "discard"};
    let meld = /^meld:(\d+):(\d+)$/.exec(text);
    return meld ? {kind : "meld", seat : Number(meld[1]), index : Number(meld[2])} : null;
};
