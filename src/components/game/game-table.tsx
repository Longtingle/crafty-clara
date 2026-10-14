import {useState} from 'react';
import {motion} from 'motion/react';
import {cn} from '@/lib/utils.ts';
import {useMediaQuery} from '@/lib/use-media-query.ts';
import {Button} from '@/components/ui/button.tsx';
import type {Card} from '@/engine/cards.ts';
import type {BotLevel} from '@/engine/bot.ts';
import type {GameView} from '@/engine/view.ts';
import TopBar from './top-bar.tsx';
import {OpponentPanel, CompactMelds} from './opponent-panel.tsx';
import Meld, {MeldRow} from './meld.tsx';
import Piles from './piles.tsx';
import ActivityLog from './activity-log.tsx';
import PlayerPanel from './player-panel.tsx';
import TurnPrompt from './turn-prompt.tsx';
import Hand from './hand.tsx';
import ScoresDialog from './scores-dialog.tsx';
import RulesDialog from './rules-dialog.tsx';
import RotatePrompt from './rotate-prompt.tsx';
import {opponentSeats, opponentIndex} from './players.ts';
import {activityEntries, lastAction, type NewCard} from './log-text.ts';
import {isInTurn, type YourTurn} from './your-turn.ts';
import type {HandSort} from './hand-order.ts';

/** Everything you can do at the table. GameScreen turns each into a command or a change to your hand. */
export interface TableActions {
    drawFromDeck(): void;
    takeDiscard(): void;
    claim(): void;
    pass(): void;
    discard(): void;
    addToMeld(seat: number, index: number): void;
    select(index: number): void;
    reorder(from: number, to: number): void;
    sortHand(sort: HandSort): void;
    openGoDown(): void;
}

interface GameTableProps {
    view: GameView;
    /** your cards in the order you've arranged them */
    hand: Card[];
    sort: HandSort;
    /** each seat's bot level, by seat (null for a person) */
    levels: (BotLevel | null)[];
    /** what you can do now (yourTurn) */
    turn: YourTurn;
    newCard: NewCard | null;
    /** what each opponent is saying, by seat */
    speech: Record<number, string | null>;
    /** why your last move was refused, for a few seconds after */
    notice: string | null;
    actions: TableActions;
}

const sectionLabel = "text-[13px] font-bold tracking-widest text-muted-foreground uppercase";

// The choices for laying out your hand, with shorter labels for short screens.
const SORTS: {sort: HandSort; label: string; short: string}[] = [
    {sort : "value", label : "By value", short : "Value"},
    {sort : "suit", label : "By suit", short : "Suit"},
    {sort : "own", label : "Your order", short : "Your order"}
];

// How your hand is laid out. A sort keeps the hand sorted as cards come and
// go; dragging a card switches to your own order.
function SortSwitch({sort, onChange}: {sort: HandSort; onChange: (sort: HandSort) => void}) {
    return (
        <div role="group" aria-labelledby="sort-hand" className="flex flex-col gap-1.5">
            <span id="sort-hand" className={cn(sectionLabel, "short:hidden")}>Sort hand</span>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">
                {SORTS.map(option => (
                    <Button
                        key={option.sort}
                        variant="ghost"
                        aria-pressed={sort === option.sort}
                        onClick={() => onChange(option.sort)}
                        className={cn(
                            "aria-pressed:bg-cream aria-pressed:text-[#12402a] aria-pressed:hover:bg-cream aria-pressed:hover:text-[#12402a] short:h-9 short:px-2 short:text-sm",
                            option.sort === "own" && "col-span-2"
                        )}
                    >
                        {(option.label === option.short) ? option.label : (
                            <>
                                <span className="short:hidden">{option.label}</span>
                                <span className="hidden short:inline">{option.short}</span>
                            </>
                        )}
                    </Button>
                ))}
            </div>
        </div>
    );
}

// The whole table: opponents along the top, piles in the middle, your hand at
// the bottom.
function GameTable({view, hand, sort, levels, turn, newCard, speech, notice, actions}: GameTableProps) {
    let [dialog, setDialog] = useState<"scores" | "rules" | null>(null);
    // The `short:` layout (see index.css) moves opponents into the top bar.
    // Opponents' cards are rendered for one layout only, because each card
    // must appear once for its animations to work.
    let short = useMediaQuery("(max-height: 560px)");
    let me = view.seats[view.seat];
    let opponents = opponentSeats(view);

    let melds = (seat: number) => view.seats[seat].table.map((setrun, setrunIndex) => (
        <Meld
            key={setrunIndex}
            setrun={setrun}
            target={turn.targets[seat][setrunIndex]}
            dimmed={turn.selected !== null && me.isDown && !turn.targets[seat][setrunIndex]}
            onClick={() => actions.addToMeld(seat, setrunIndex)}
        />
    ));

    let pile = turn.discardPile;
    let discardAction = pile && {
        chip : pile.chip,
        label : pile.label,
        onClick : (pile.move === "take") ? actions.takeDiscard : actions.discard
    };
    let claim = view.claim?.canAnswer
        ? {card : view.claim.card, closesIn : view.claim.closesIn, onClaim : actions.claim, onPass : actions.pass}
        : null;

    return (
        <div className="relative grid h-dvh grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden bg-felt shadow-[inset_0_0_180px_rgb(0_0_0/0.4)] short:grid-rows-[auto_minmax(0,1fr)_auto]">
            <TopBar
                round={view.round}
                roundCount={view.rounds}
                requirement={view.requirement}
                requirementMet={me.isDown}
                opponents={opponents.map(seat => ({
                    index : opponentIndex(view, seat),
                    name : view.seats[seat].name,
                    count : view.seats[seat].cards.length,
                    isDown : view.seats[seat].isDown,
                    hard : levels[seat] === "hard",
                    active : isInTurn(view, seat),
                    cards : short ? view.seats[seat].cards : null
                }))}
                onShowScores={() => setDialog("scores")}
                onShowRules={() => setDialog("rules")}
            />

            {!short && (
                <section
                    aria-label="Opponents"
                    className="grid gap-5 px-6 pt-3 compact:pt-2"
                    style={{gridTemplateColumns : `repeat(${opponents.length}, minmax(0, 1fr))`}}
                >
                    {opponents.map(seat => (
                        <OpponentPanel
                            key={seat}
                            player={view.seats[seat]}
                            index={opponentIndex(view, seat)}
                            hard={levels[seat] === "hard"}
                            active={isInTurn(view, seat)}
                            speech={speech[seat]}
                            lastAction={lastAction(view, seat)}
                        >
                            {melds(seat)}
                        </OpponentPanel>
                    ))}
                </section>
            )}

            <section className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 px-6 [grid-template-areas:'mine_piles_log'] short:gap-3 short:px-3 short:[grid-template-areas:'opps_piles_mine']">
                <motion.div
                    layoutScroll
                    className="hidden min-w-0 flex-wrap content-start gap-x-3 gap-y-2 self-stretch overflow-y-auto py-2 [scrollbar-width:thin] [--meld-w:34px] [grid-area:opps] short:flex"
                >
                    {short && <CompactMelds view={view} seats={opponents} melds={melds} />}
                </motion.div>

                <div className="flex min-w-0 flex-col gap-2.5 self-end pb-1 [grid-area:mine] short:items-end short:self-center">
                    <h2 className={cn(sectionLabel, "short:hidden")}>Your melds</h2>
                    {me.isDown
                        ? <MeldRow setruns={me.table} className="short:justify-end">{melds(view.seat)}</MeldRow>
                        : (
                            <div className="grid h-(--meld-row) w-full max-w-80 place-items-center rounded-xl border-2 border-dashed border-white/18 px-4 text-center text-sm text-muted-foreground">
                                Your melds go here once you go down
                            </div>
                        )}
                </div>

                <div className="[grid-area:piles]">
                    <Piles
                        deckTopId={view.deck.top}
                        deckCount={view.deck.count}
                        deckActive={turn.deckLive}
                        onDeckClick={actions.drawFromDeck}
                        discard={view.discard}
                        discardAction={discardAction}
                        claim={claim}
                    />
                </div>

                <div className="flex justify-end [grid-area:log] short:hidden">
                    <ActivityLog entries={activityEntries(view)} />
                </div>
            </section>

            <section className="grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,15rem)] items-end gap-6 px-6 pb-4 short:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_minmax(0,8rem)] short:gap-3 short:px-3 short:pb-2">
                <div className="mb-4 short:mb-2">
                    <PlayerPanel active={isInTurn(view, view.seat)} isDown={me.isDown} score={me.total} cardCount={hand.length} />
                </div>

                <div className="flex min-w-0 flex-col items-center gap-2.5 short:gap-1">
                    <TurnPrompt steps={turn.steps} text={turn.prompt} notice={notice} />
                    <Hand
                        key={view.round}
                        cards={hand}
                        selected={turn.selected?.index ?? null}
                        selectable={turn.playing}
                        newCard={newCard}
                        playable={turn.playable}
                        onSelect={actions.select}
                        onReorder={actions.reorder}
                    />
                </div>

                <div className="mb-4 flex flex-col gap-3 short:mb-2 short:gap-1.5">
                    <SortSwitch sort={sort} onChange={actions.sortHand} />
                    <Button
                        size="lg"
                        variant="secondary"
                        disabled={!turn.goDown.enabled}
                        onClick={actions.openGoDown}
                        className="short:h-10"
                    >
                        Go down
                    </Button>
                    <span className="text-center text-[13px] text-muted-foreground short:hidden">{turn.goDown.hint}</span>
                </div>
            </section>

            <ScoresDialog open={dialog === "scores"} onOpenChange={(open) => setDialog(open ? "scores" : null)} view={view} />
            <RulesDialog open={dialog === "rules"} onOpenChange={(open) => setDialog(open ? "rules" : null)} />
            <RotatePrompt />
        </div>
    );
}

export default GameTable;
