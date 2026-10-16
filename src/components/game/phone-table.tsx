import type {CSSProperties, ReactNode} from 'react';
import {ArrowDownUp, CircleAlert} from 'lucide-react';
import {cn} from '@/lib/utils.ts';
import {Button} from '@/components/ui/button.tsx';
import type {Card} from '@/engine/cards.ts';
import type {CharacterId} from '@/engine/cast.ts';
import type {GameView} from '@/engine/view.ts';
import Hand from './hand.tsx';
import {MeldRow} from './meld.tsx';
import {Avatar} from './opponent-panel.tsx';
import {opponentIndex, opponentSeats, seatColor, seatName, seatPlaces} from './players.ts';
import {activityEntries, type NewCard} from './log-text.ts';
import SpeechBubble, {type Bubble} from './speech-bubble.tsx';
import LookPrompt from './look-prompt.tsx';
import type {TableActions} from './game-table.tsx';
import type {YourTurn} from './your-turn.ts';
import type {HandSort} from './hand-order.ts';

// The table on a phone held sideways (any screen 560px high or less). Under
// the top bar, a status line says what the opponents last did and what you
// can do. Each player's melds have their own quarter of the table, the deck
// and the discard pile overhang the right edge, and your hand is an arch
// along the bottom edge with only the top of each card showing.

// The newest thing an opponent did, for the status line. What they say shows
// in a bubble by their portrait.
const latestNews = (view: GameView) => activityEntries(view).find(entry => entry.name !== "You") ?? null;

interface StatusLineProps {
    view: GameView;
    /** what you can do (YourTurn.brief) */
    prompt: string;
    /** why your last move was refused, shown in place of the prompt */
    notice: string | null;
}

function StatusLine({view, prompt, notice}: StatusLineProps) {
    let news = latestNews(view);
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
    /** who sits in each seat, by seat */
    characters: (CharacterId | null)[];
    /** what each opponent is saying, by seat */
    speech: Record<number, Bubble | null>;
    /** renders a seat's setruns */
    melds: (seat: number) => ReactNode;
    /** opens the go-down dialog, while you can go down */
    onGoDown: (() => void) | null;
    /** whether your hand has what the round needs (a hint) */
    ready: boolean;
}

// Every player's melds in their own place (seatPlaces), down or not, so
// nothing moves when someone goes down. A player's melds stay on one line,
// their cards shrinking to fit the width and the height of the place. What
// an opponent says shows in a bubble beside their portrait, within their
// place.
function SeatGrid({view, characters, speech, melds, onGoDown, ready}: SeatGridProps) {
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
                        <span className={cn("relative mt-1.5 flex-none self-start", characters[seat] && "mt-1")}>
                            <Avatar
                                color={seatColor(view, seat)}
                                label={you ? "You" : opponentIndex(view, seat) + 1}
                                character={characters[seat]}
                                className={cn("size-6 text-[11px]", you && "text-[9px] text-[#12402a]", characters[seat] && "size-7.5 p-0.5")}
                            />
                            {!you && (
                                <SpeechBubble
                                    bubble={speech[seat]}
                                    name={name}
                                    from="left"
                                    className="top-1/2 left-full ml-2.5 max-w-[calc(100cqw-56px)] -translate-y-1/2 rounded-[14px] px-2.75 py-1.5 text-[13px] leading-tight"
                                />
                            )}
                        </span>
                        {player.isDown && (
                            <div className="min-w-0 flex-1">
                                <MeldRow setruns={player.table} className="flex-nowrap items-center">{melds(seat)}</MeldRow>
                            </div>
                        )}
                        {!player.isDown && you && onGoDown && (
                            <Button variant={ready ? "default" : "secondary"} onClick={onGoDown} className={cn(ready && "pulse-gold")}>Go down</Button>
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
    /** who sits in each seat, by seat */
    characters: (CharacterId | null)[];
    /** your cards in the order you've arranged them */
    hand: Card[];
    sort: HandSort;
    turn: YourTurn;
    /** ms until play starts, while everyone looks over their hand */
    lookLeft: number;
    newCard: NewCard | null;
    /** what each opponent is saying, by seat */
    speech: Record<number, Bubble | null>;
    notice: string | null;
    actions: TableActions;
    topBar: ReactNode;
    piles: ReactNode;
    melds: (seat: number) => ReactNode;
}

function PhoneTable({view, characters, hand, sort, turn, lookLeft, newCard, speech, notice, actions, topBar, piles, melds}: PhoneTableProps) {
    // The hand hangs off the bottom edge and the piles off the right. Clipped
    // rather than hidden, the overflow can't be scrolled into view, which
    // the browser would otherwise do for a card you tap.
    return (
        <div className="relative h-dvh overflow-clip bg-felt shadow-[inset_0_0_140px_rgb(0_0_0/0.4)]">
            {topBar}
            <StatusLine view={view} prompt={turn.brief} notice={notice} />
            <SeatGrid view={view} characters={characters} speech={speech} melds={melds} onGoDown={turn.goDown.enabled ? actions.openGoDown : null} ready={turn.goDown.ready} />
            {turn.look && (
                // over the melds, which are all still to come
                <div className="pointer-events-none absolute top-19 right-[calc(var(--pile-w)*0.8+8px)] bottom-[calc(var(--hand-show)+var(--hand-w)*0.15+8px)] left-2 z-10 grid place-items-center">
                    <div className="pointer-events-auto">
                        <LookPrompt
                            floating
                            starter={turn.look.starter}
                            left={lookLeft}
                            total={turn.look.total}
                            waitingFor={turn.look.waitingFor}
                            onReady={actions.start}
                        />
                    </div>
                </div>
            )}
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
