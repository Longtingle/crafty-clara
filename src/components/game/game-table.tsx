import {useShortScreen} from '@/lib/use-media-query.ts';
import {SegmentedControl, type Segment} from '@/components/ui/segmented-control.tsx';
import type {Talk} from '@/client/game-client.ts';
import TopBar from './top-bar.tsx';
import {OpponentPanel} from './opponent-panel.tsx';
import Meld, {MeldRow} from './meld.tsx';
import Piles from './piles.tsx';
import ActivityLog from './activity-log.tsx';
import PlayerPanel from './player-panel.tsx';
import TurnPrompt from './turn-prompt.tsx';
import TableDnd from './table-dnd.tsx';
import ScoresDialog from './scores-dialog.tsx';
import RulesDialog from './rules-dialog.tsx';
import RotatePrompt from './rotate-prompt.tsx';
import PhoneTable from './phone-table.tsx';
import {GoDownButton, YourHand, YourLookPrompt} from './your-seat.tsx';
import {opponentSeats, opponentIndex} from './players.ts';
import {activityEntries, knownCards, lastAction} from './log-text.ts';
import {isInTurn} from './your-turn.ts';
import {useTable, type TableDialog} from './table-context.ts';
import type {EndChoice} from './meld.tsx';
import type {HandSort} from './hand-order.ts';
import type {Bubble} from './speech-bubble.tsx';

interface GameTableProps {
    sort: HandSort;
    /** whether the game is paused, which stops the claim countdown */
    paused: boolean;
    /** the scores, the rules or the settings, if open */
    dialog: TableDialog | null;
    /** ms until play starts, while everyone looks over their hand */
    lookLeft: number;
    /** the run the selected card asks which end of, by seat and setrun */
    endChoice: {seat: number; index: number; choice: EndChoice} | null;
    /** what each opponent is saying now, by seat */
    speech: Record<number, Bubble | null>;
    /** the table talk you see this round, for the activity */
    talk: Talk[];
    /** why your last move was refused, for a few seconds after */
    notice: string | null;
}

const sectionLabel = "section-label text-[13px]";

// The choices for laying out your hand.
const SORTS: Segment<HandSort>[] = [
    {value : "value", label : "By value"},
    {value : "suit", label : "By suit"},
    {value : "own", label : "Your order", className : "col-span-2"}
];

// How your hand is laid out. A sort keeps the hand sorted as cards come and
// go; dragging a card switches to your own order.
function SortSwitch({sort, onChange}: {sort: HandSort; onChange: (sort: HandSort) => void}) {
    return (
        <div className="flex flex-col gap-1.5">
            <span id="sort-hand" className={sectionLabel}>Sort hand</span>
            <SegmentedControl options={SORTS} value={sort} onChange={onChange} labelledBy="sort-hand" className="grid-cols-2" />
        </div>
    );
}

// The whole table: opponents along the top, piles in the middle, your hand at
// the bottom. Short screens (phones held sideways) get their own layout
// (PhoneTable), with the opponents in the top bar.
function GameTable({sort, paused, dialog, lookLeft, endChoice, speech, talk, notice}: GameTableProps) {
    let {view, seats, hand, turn, actions} = useTable();
    let characters = seats.map(seat => seat.character);
    // Each card is rendered for one layout only, because each card must
    // appear once for its animations to work.
    let short = useShortScreen();
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
                level : seats[seat].level,
                character : seats[seat].character,
                active : isInTurn(view, seat),
                cards : short ? view.seats[seat].cards : null,
                known : knownCards(view, seat)
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
            <ScoresDialog open={dialog === "scores"} onOpenChange={(open) => actions.showDialog(open ? "scores" : null)} view={view} characters={characters} />
            <RulesDialog open={dialog === "rules"} onOpenChange={(open) => actions.showDialog(open ? "rules" : null)} />
            <RotatePrompt />
        </>
    );

    if (short) {
        return (
            <TableDnd>
                <PhoneTable sort={sort} lookLeft={lookLeft} speech={speech} notice={notice} topBar={topBar} piles={piles} melds={melds} />
                {dialogs}
            </TableDnd>
        );
    }

    return (
        <TableDnd>
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
                            level={seats[seat].level}
                            character={seats[seat].character}
                            known={knownCards(view, seat)}
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
                        <ActivityLog entries={activityEntries(view, talk)} />
                    </div>
                </section>

                <section className="grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,15rem)] items-end gap-6 px-6 pb-4">
                    <div className="mb-4">
                        <PlayerPanel active={isInTurn(view, view.seat)} isDown={me.isDown} score={me.total} cardCount={hand.length} />
                    </div>

                    <div className="flex min-w-0 flex-col items-center gap-2.5">
                        {turn.look
                            ? <YourLookPrompt left={lookLeft} />
                            : <TurnPrompt steps={turn.steps} text={turn.prompt} notice={notice} />}
                        <YourHand />
                    </div>

                    {/* no taller than the hand in a short window, to leave the piles room */}
                    <div className="mb-4 flex flex-col gap-3 compact:mb-0 compact:gap-2">
                        <SortSwitch sort={sort} onChange={actions.sortHand} />
                        <GoDownButton size="lg" />
                        <span className="text-center text-[13px] text-muted-foreground">{turn.goDown.hint}</span>
                    </div>
                </section>

                {dialogs}
            </div>
        </TableDnd>
    );
}

export default GameTable;
