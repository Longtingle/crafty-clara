import {cn} from '@/lib/utils.ts';
import {useMediaQuery} from '@/lib/use-media-query.ts';
import {Button} from '@/components/ui/button.tsx';
import type {Card} from '@/engine/cards.ts';
import type {BotLevel} from '@/engine/bot.ts';
import type {GameView} from '@/engine/view.ts';
import TopBar from './top-bar.tsx';
import {OpponentPanel} from './opponent-panel.tsx';
import Meld, {MeldRow} from './meld.tsx';
import Piles from './piles.tsx';
import ActivityLog from './activity-log.tsx';
import PlayerPanel from './player-panel.tsx';
import TurnPrompt from './turn-prompt.tsx';
import LookPrompt from './look-prompt.tsx';
import Hand from './hand.tsx';
import TableDnd, {type DragActions} from './table-dnd.tsx';
import ScoresDialog from './scores-dialog.tsx';
import RulesDialog from './rules-dialog.tsx';
import RotatePrompt from './rotate-prompt.tsx';
import PhoneTable from './phone-table.tsx';
import {opponentSeats, opponentIndex} from './players.ts';
import {activityEntries, lastAction, type NewCard} from './log-text.ts';
import {isInTurn, type YourTurn} from './your-turn.ts';
import type {RunEnd} from '@/engine/setruns.ts';
import type {EndChoice} from './meld.tsx';
import type {HandSort} from './hand-order.ts';

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

interface GameTableProps {
    view: GameView;
    /** your cards in the order you've arranged them */
    hand: Card[];
    sort: HandSort;
    /** each seat's bot level, by seat (null for a person) */
    levels: (BotLevel | null)[];
    /** whether the game is paused, which stops the claim countdown */
    paused: boolean;
    /** the scores, the rules or the settings, if open */
    dialog: TableDialog | null;
    /** what you can do now (yourTurn) */
    turn: YourTurn;
    /** ms until play starts, while everyone looks over their hand */
    lookLeft: number;
    /** the run the selected card asks which end of, by seat and setrun */
    endChoice: {seat: number; index: number; choice: EndChoice} | null;
    newCard: NewCard | null;
    /** what each opponent is saying, by seat */
    speech: Record<number, string | null>;
    /** why your last move was refused, for a few seconds after */
    notice: string | null;
    actions: TableActions;
}

const sectionLabel = "text-[13px] font-bold tracking-widest text-muted-foreground uppercase";

// The choices for laying out your hand.
const SORTS: {sort: HandSort; label: string}[] = [
    {sort : "value", label : "By value"},
    {sort : "suit", label : "By suit"},
    {sort : "own", label : "Your order"}
];

// How your hand is laid out. A sort keeps the hand sorted as cards come and
// go; dragging a card switches to your own order.
function SortSwitch({sort, onChange}: {sort: HandSort; onChange: (sort: HandSort) => void}) {
    return (
        <div role="group" aria-labelledby="sort-hand" className="flex flex-col gap-1.5">
            <span id="sort-hand" className={sectionLabel}>Sort hand</span>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">
                {SORTS.map(option => (
                    <Button
                        key={option.sort}
                        variant="ghost"
                        aria-pressed={sort === option.sort}
                        onClick={() => onChange(option.sort)}
                        className={cn(
                            "aria-pressed:bg-cream aria-pressed:text-[#12402a] aria-pressed:hover:bg-cream aria-pressed:hover:text-[#12402a]",
                            option.sort === "own" && "col-span-2"
                        )}
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}

// The whole table: opponents along the top, piles in the middle, your hand at
// the bottom. Short screens (phones held sideways) get their own layout
// (PhoneTable), with the opponents in the top bar.
function GameTable({view, hand, sort, levels, paused, dialog, turn, lookLeft, endChoice, newCard, speech, notice, actions}: GameTableProps) {
    // Each card is rendered for one layout only, because each card must
    // appear once for its animations to work.
    let short = useMediaQuery("(max-height: 560px)");
    let me = view.seats[view.seat];
    let opponents = opponentSeats(view);

    let melds = (seat: number) => view.seats[seat].table.map((setrun, setrunIndex) => (
        <Meld
            key={setrunIndex}
            seat={seat}
            index={setrunIndex}
            setrun={setrun}
            target={turn.targets[seat][setrunIndex]}
            dimmed={turn.selected !== null && me.isDown && !turn.targets[seat][setrunIndex]}
            onClick={() => actions.addToMeld(seat, setrunIndex)}
            choice={(endChoice?.seat === seat && endChoice.index === setrunIndex) ? endChoice.choice : null}
            onChoose={actions.chooseEnd}
            onCancelChoice={actions.cancelChoice}
        />
    ));

    let pile = turn.discardPile;
    let discardAction = pile && {
        move : pile.move,
        chip : pile.chip,
        label : pile.label,
        onClick : (pile.move === "take") ? actions.takeDiscard : actions.discard
    };
    let claim = view.claim?.canAnswer
        ? {card : view.claim.card, closesIn : view.claim.closesIn, onClaim : actions.claim, onPass : actions.pass}
        : null;

    let topBar = (
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
            you={{points : me.total, active : isInTurn(view, view.seat)}}
            onPause={actions.pause}
            onShowScores={() => actions.showDialog("scores")}
            onShowRules={() => actions.showDialog("rules")}
            onShowSettings={() => actions.showDialog("settings")}
        />
    );
    let piles = (
        <Piles
            deckTopId={view.deck.top}
            deckCount={view.deck.count}
            deckActive={turn.deckLive}
            onDeckClick={actions.drawFromDeck}
            discard={view.discard}
            discardAction={discardAction}
            claim={claim}
            paused={paused}
        />
    );
    let dialogs = (
        <>
            <ScoresDialog open={dialog === "scores"} onOpenChange={(open) => actions.showDialog(open ? "scores" : null)} view={view} />
            <RulesDialog open={dialog === "rules"} onOpenChange={(open) => actions.showDialog(open ? "rules" : null)} />
            <RotatePrompt />
        </>
    );

    if (short) {
        return (
            <TableDnd view={view} hand={hand} turn={turn} actions={actions}>
                <PhoneTable
                    view={view}
                    hand={hand}
                    sort={sort}
                    turn={turn}
                    lookLeft={lookLeft}
                    newCard={newCard}
                    speech={speech}
                    notice={notice}
                    actions={actions}
                    topBar={topBar}
                    piles={piles}
                    melds={melds}
                />
                {dialogs}
            </TableDnd>
        );
    }

    return (
        <TableDnd view={view} hand={hand} turn={turn} actions={actions}>
            <div className="relative grid h-dvh grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden bg-felt shadow-[inset_0_0_180px_rgb(0_0_0/0.4)]">
                {topBar}

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
                            lastAction={view.look ? (view.look.ready[seat] ? "Ready" : "Looking at their hand") : lastAction(view, seat)}
                        >
                            {melds(seat)}
                        </OpponentPanel>
                    ))}
                </section>

                {/* as tall as the window leaves, so the activity can't push the piles down */}
                <section className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] items-center gap-6 px-6 [grid-template-areas:'mine_piles_log']">
                    {/* in a short window it runs down into the space above your panel */}
                    <div className="flex min-w-0 flex-col gap-2.5 self-end pb-1 [grid-area:mine] compact:self-start compact:pt-2">
                        <h2 className={sectionLabel}>Your melds</h2>
                        {me.isDown
                            ? <MeldRow setruns={me.table}>{melds(view.seat)}</MeldRow>
                            : (
                                <div className="grid h-(--meld-row) w-full max-w-80 place-items-center rounded-xl border-2 border-dashed border-white/18 px-4 text-center text-sm text-muted-foreground">
                                    Your melds go here once you go down
                                </div>
                            )}
                    </div>

                    <div className="[grid-area:piles]">{piles}</div>

                    <div className="flex min-h-0 items-center justify-end self-stretch [grid-area:log]">
                        <ActivityLog entries={activityEntries(view)} />
                    </div>
                </section>

                <section className="grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,15rem)] items-end gap-6 px-6 pb-4">
                    <div className="mb-4">
                        <PlayerPanel active={isInTurn(view, view.seat)} isDown={me.isDown} score={me.total} cardCount={hand.length} />
                    </div>

                    <div className="flex min-w-0 flex-col items-center gap-2.5">
                        {turn.look
                            ? (
                                <LookPrompt
                                    starter={turn.look.starter}
                                    left={lookLeft}
                                    total={turn.look.total}
                                    waitingFor={turn.look.waitingFor}
                                    onReady={actions.start}
                                />
                            )
                            : <TurnPrompt steps={turn.steps} text={turn.prompt} notice={notice} />}
                        <Hand
                            key={view.round}
                            cards={hand}
                            selected={turn.selected?.index ?? null}
                            selectable={turn.playing}
                            newCard={newCard}
                            playable={turn.playable}
                            onSelect={actions.select}
                        />
                    </div>

                    {/* no taller than the hand in a short window, to leave the piles room */}
                    <div className="mb-4 flex flex-col gap-3 compact:mb-0 compact:gap-2">
                        <SortSwitch sort={sort} onChange={actions.sortHand} />
                        <Button
                            size="lg"
                            variant={turn.goDown.ready ? "default" : "secondary"}
                            disabled={!turn.goDown.enabled}
                            onClick={actions.openGoDown}
                            className={cn(turn.goDown.ready && "pulse-gold")}
                        >
                            Go down
                        </Button>
                        <span className="text-center text-[13px] text-muted-foreground">{turn.goDown.hint}</span>
                    </div>
                </section>

                {dialogs}
            </div>
        </TableDnd>
    );
}

export default GameTable;
