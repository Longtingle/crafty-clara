import {createContext, use} from 'react';
import type {Card} from '@/engine/cards.ts';
import type {RunEnd} from '@/engine/setruns.ts';
import type {GameView} from '@/engine/view.ts';
import type {SeatInfo} from '@/host/protocol.ts';
import type {DragActions} from './table-dnd.tsx';
import type {HandSort} from './hand-order.ts';
import type {YourTurn} from './your-turn.ts';

/** A dialog you can open from the top bar while you play. GameScreen shows the settings. */
export type TableDialog = "scores" | "rules" | "settings";

/** Everything you can do at the table. GameScreen turns each into a command or a change to your hand. */
export interface TableActions extends DragActions {
    /** ready to start play, at the start of a round */
    start(): void;
    /** plays the selected card at this end of the run it asked about */
    chooseEnd(end: RunEnd): void;
    cancelChoice(): void;
    drawFromDeck(): void;
    takeDiscard(): void;
    claim(): void;
    pass(): void;
    select(index: number): void;
    sortHand(sort: HandSort): void;
    pause(): void;
    openGoDown(): void;
    showDialog(dialog: TableDialog | null): void;
}

/** The game as the table shows it, for any piece of either layout (wide, or PhoneTable) to read. */
export interface Table {
    view: GameView;
    /** who sits in each seat, by seat */
    seats: SeatInfo[];
    /** your cards in the order you've arranged them */
    hand: Card[];
    /** what you can do now (yourTurn) */
    turn: YourTurn;
    actions: TableActions;
}

export const TableContext = createContext<Table | null>(null);

/** The table this piece is part of (GameScreen provides it). */
export const useTable = (): Table => {
    let table = use(TableContext);
    if (!table) throw new Error("useTable() outside a table");
    return table;
};
