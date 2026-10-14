import type {CSSProperties, ReactNode} from 'react';
import {ArrowDownUp, CircleAlert} from 'lucide-react';
import {cn} from '@/lib/utils.ts';
import {Button} from '@/components/ui/button.tsx';
import type {Card} from '@/engine/cards.ts';
import type {GameView} from '@/engine/view.ts';
import Hand from './hand.tsx';
import {MeldRow} from './meld.tsx';
import {Avatar} from './opponent-panel.tsx';
import {opponentIndex, opponentSeats, seatColor, seatName, seatPlaces} from './players.ts';
import {activityEntries, type NewCard} from './log-text.ts';
import type {TableActions} from './game-table.tsx';
import type {YourTurn} from './your-turn.ts';
import type {HandSort} from './hand-order.ts';

// The table on a phone held sideways (any screen 560px high or less). Under
// the top bar, a status line says what the opponents last did and what you
// can do. Each player's melds have their own quarter of the table, the deck
// and the discard pile overhang the right edge, and your hand is an arch
// along the bottom edge with only the top of each card showing.

// The newest thing an opponent did or is saying, for the status line.
function latestNews(view: GameView, speech: Record<number, string | null>): {name: string; color: string; text: string} | null {
    let speaking = view.log.findLast(entry => speech[entry.seat])?.seat ??
        opponentSeats(view).find(seat => speech[seat]);
    if (speaking !== undefined) {
        return {name : seatName(view, speaking), color : seatColor(view, speaking), text : "“" + speech[speaking] + "”"};
    }
    return activityEntries(view).find(entry => entry.name !== "You") ?? null;
}

interface StatusLineProps {
    view: GameView;
    speech: Record<number, string | null>;
    /** what you can do (YourTurn.brief) */
    prompt: string;
    /** why your last move was refused, shown in place of the prompt */
    notice: string | null;
}

function StatusLine({view, speech, prompt, notice}: StatusLineProps) {
    let news = latestNews(view, speech);
    return (
        <div className="absolute inset-x-0 top-11 flex h-7 items-center gap-3 px-3 text-[12.5px]">
            <p aria-label="Latest move" className="flex min-w-0 flex-1 items-center gap-1.5 text-muted-foreground">
                {news && (
                    <>
                        <span aria-hidden="true" className="size-2 flex-none rounded-full" style={{backgroundColor : news.color}} />
                        <span className="truncate">{news.name} {news.text}</span>
                    </>
                )}
            </p>
            <p role="status" aria-live="polite" className={cn("flex max-w-[70%] min-w-0 items-center gap-1.5 font-bold", notice && "text-warn")}>
                {notice
                    ? <CircleAlert aria-hidden="true" className="size-3.5 flex-none" />
                    : <span aria-hidden="true" className="size-2 flex-none rounded-full bg-gold" />}
                <span className="truncate">{notice ?? prompt}</span>
            </p>
        </div>
    );
}

interface SeatGridProps {
    view: GameView;
    /** renders a seat's setruns */
    melds: (seat: number) => ReactNode;
    /** opens the go-down dialog, while you can go down */
    onGoDown: (() => void) | null;
}

// Every player's melds in their own place (seatPlaces), down or not, so
// nothing moves when someone goes down. A player's melds stay on one line,
// their cards shrinking to fit the width and the height of the place.
function SeatGrid({view, melds, onGoDown}: SeatGridProps) {
    let seats = [view.seat, ...opponentSeats(view)];
    let {columns, places} = seatPlaces(seats.length);
    return (
        <section
            aria-label="Melds"
            className="absolute top-19 right-[calc(var(--pile-w)*0.8+8px)] bottom-[calc(var(--hand-show)+var(--hand-w)*0.15+8px)] left-2 grid grid-rows-2 gap-1.5"
            style={{gridTemplateColumns : `repeat(${columns}, minmax(0, 1fr))`}}
        >
            {seats.map((seat, i) => {
                let player = view.seats[seat];
                let you = seat === view.seat;
                let name = seatName(view, seat);
                let style = {
                    gridRow : places[i].row + 1,
                    gridColumn : places[i].column + 1,
                    // setrun cards as tall as the place allows
                    "--meld-w-full" : "min(64px, calc((100cqh - 10px) / 1.528))"
                } as CSSProperties;
                return (
                    <div
                        key={seat}
                        role="group"
                        aria-label={you ? "Your melds" : name + "'s melds"}
                        style={style}
                        className={cn(
                            "flex min-w-0 items-center gap-1.5 rounded-[10px] px-1.5 [container-type:size]",
                            player.isDown ? "bg-black/16" : "border-[1.5px] border-dashed border-white/16"
                        )}
                    >
                        <Avatar
                            color={seatColor(view, seat)}
                            label={you ? "You" : opponentIndex(view, seat) + 1}
                            className={cn("mt-1.5 size-6 self-start text-[11px]", you && "text-[9px] text-[#12402a]")}
                        />
                        {player.isDown && (
                            <div className="min-w-0 flex-1">
                                <MeldRow setruns={player.table} className="flex-nowrap items-center">{melds(seat)}</MeldRow>
                            </div>
                        )}
                        {!player.isDown && you && onGoDown && (
                            <Button variant="secondary" onClick={onGoDown}>Go down</Button>
                        )}
                        {!player.isDown && !(you && onGoDown) && (
                            <span className="text-xs text-muted-foreground">Not down yet</span>
                        )}
                    </div>
                );
            })}
        </section>
    );
}

const SORT_NAMES: Record<HandSort, [short: string, long: string]> = {
    value : ["Value", "by value"],
    suit : ["Suit", "by suit"],
    own : ["Yours", "in your order"]
};
const NEXT_SORT: Record<HandSort, HandSort> = {value : "suit", suit : "own", own : "value"};

// One button that steps through the ways to lay out your hand.
function SortButton({sort, onChange}: {sort: HandSort; onChange: (sort: HandSort) => void}) {
    return (
        <button
            type="button"
            onClick={() => onChange(NEXT_SORT[sort])}
            aria-label={"Hand sorted " + SORT_NAMES[sort][1] + ". Sort " + SORT_NAMES[NEXT_SORT[sort]][1]}
            className="absolute bottom-1.5 left-1.5 z-20 flex size-11 flex-col items-center justify-center gap-0.5 rounded-xl bg-black/30 text-[10px] font-bold hover:bg-black/40"
        >
            <ArrowDownUp aria-hidden="true" className="size-4" />
            {SORT_NAMES[sort][0]}
        </button>
    );
}

interface PhoneTableProps {
    view: GameView;
    /** your cards in the order you've arranged them */
    hand: Card[];
    sort: HandSort;
    turn: YourTurn;
    newCard: NewCard | null;
    speech: Record<number, string | null>;
    notice: string | null;
    actions: TableActions;
    topBar: ReactNode;
    piles: ReactNode;
    melds: (seat: number) => ReactNode;
}

function PhoneTable({view, hand, sort, turn, newCard, speech, notice, actions, topBar, piles, melds}: PhoneTableProps) {
    // The hand hangs off the bottom edge and the piles off the right. Clipped
    // rather than hidden, the overflow can't be scrolled into view, which
    // the browser would otherwise do for a card you tap.
    return (
        <div className="relative h-dvh overflow-clip bg-felt shadow-[inset_0_0_140px_rgb(0_0_0/0.4)]">
            {topBar}
            <StatusLine view={view} speech={speech} prompt={turn.brief} notice={notice} />
            <SeatGrid view={view} melds={melds} onGoDown={turn.goDown.enabled ? actions.openGoDown : null} />
            {/* the hand starts right of the sort button and stops short of the piles */}
            <div className="absolute right-[calc(var(--pile-w)*0.8+10px)] bottom-0 left-[58px] h-(--hand-show)">
                <Hand
                    key={view.round}
                    arched
                    cards={hand}
                    selected={turn.selected?.index ?? null}
                    selectable={turn.playing}
                    newCard={newCard}
                    playable={turn.playable}
                    onSelect={actions.select}
                />
            </div>
            <div className="absolute top-20 right-[calc(var(--pile-w)*-0.2)]">{piles}</div>
            <SortButton sort={sort} onChange={actions.sortHand} />
        </div>
    );
}

export default PhoneTable;
