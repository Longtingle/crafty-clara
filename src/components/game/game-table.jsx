import {useState} from 'react';
import {motion} from 'motion/react';
import {cn} from '@/lib/utils.js';
import {useMediaQuery} from '@/lib/use-media-query.js';
import {Button} from '@/components/ui/button.jsx';
import {addToSetrun} from '@/engine/setruns.ts';
import {planGoDown} from '@/engine/bot.ts';
import {shortName, longName, requirementText} from '@/engine/card-names.ts';
import TopBar from './top-bar.jsx';
import {OpponentPanel} from './opponent-panel.jsx';
import Meld, {MeldRow} from './meld.jsx';
import Piles from './piles.jsx';
import ActivityLog from './activity-log.jsx';
import PlayerPanel from './player-panel.jsx';
import TurnPrompt from './turn-prompt.jsx';
import Hand from './hand.jsx';
import ScoresDialog from './scores-dialog.jsx';
import RulesDialog from './rules-dialog.jsx';
import RotatePrompt from './rotate-prompt.jsx';
import {aiColor, opponentSeats, opponentIndex} from './players.js';
import {activityEntries, lastAction} from './log-text.js';

const sectionLabel = "text-[13px] font-bold tracking-widest text-muted-foreground uppercase";

// What the turn prompt says, and which turn step is current.
const describeTurn = ({view, selected, targets, swap, playable, canGoDown}) => {
    let me = view.seats[view.seat];
    let {discard, claim} = view;
    let middle = me.isDown ? "Add to melds" : "Go down";

    if (view.phase === "roundEnd" || view.phase === "gameEnd") return {steps : null, text : "Round over."};

    if (view.turn === view.seat && view.phase === "draw") {
        let text;
        if (!view.deck.canDraw) text = "The deck is empty. Take the " + shortName(discard[0]) + ".";
        else if (discard.length > 0) text = "Draw from the deck or take the " + shortName(discard[0]) + ".";
        else text = "Draw from the deck.";
        return {
            steps : [{label : "Draw", state : "current"}, {label : middle, state : "todo"}, {label : "Discard", state : "todo"}],
            text : ((view.log.length === 0) ? "You start this round. " : "Your turn. ") + text
        };
    }

    if (view.turn === view.seat) {
        let steps = [
            {label : "Draw", state : "done"},
            {label : middle, state : selected ? "todo" : "current"},
            {label : "Discard", state : selected ? "current" : "todo"}
        ];
        let text;
        if (claim && !(selected && targets > 0)) {
            // you can't discard until the others have claimed or passed
            text = "Waiting to see if anyone claims the " + shortName(claim.card) + ".";
        } else if (!selected) {
            if (me.isDown) {
                text = "Select a card to add to a meld or discard." +
                    (playable.some(Boolean) ? " Gold dots mark cards that fit." : "");
            } else if (canGoDown) {
                text = "You have what you need. Go down, or select a card to discard.";
            } else {
                text = "Select a card to discard. To go down you need " + requirementText(view.requirement) + ".";
            }
        } else if (swap) {
            text = shortName(selected) + " can replace the wild " + shortName(swap.returnedAce) + " in " + swap.owner +
                ", and the ace comes back to you.";
        } else if (targets > 0) {
            text = "Add " + shortName(selected) + " to a highlighted meld, or discard it to end your turn.";
        } else if (me.isDown) {
            text = shortName(selected) + " doesn't fit any meld. Discard it to end your turn.";
        } else {
            text = "Discard " + shortName(selected) + " to end your turn, or pick another card.";
        }
        return {steps, text};
    }

    let name = view.seats[view.turn].name;
    if (claim?.canAnswer) {
        return {steps : null, text : name + " drew from the deck. Claim the " + shortName(claim.card) + ", or pass?"};
    }
    if (view.log.length === 0) return {steps : null, text : name + " starts this round."};
    return {steps : null, text : name + " is playing."};
}

// The whole table: opponents along the top, piles in the middle, your hand at
// the bottom. view is your seat's view of the game; hand is your cards in the
// order you've arranged them, and selected an index into it. All moves go
// through `actions` (GameScreen).
function GameTable({view, hand, selected, newCard, speech, notice, actions}) {
    let [dialog, setDialog] = useState(null);
    // The `short:` layout (see index.css) moves opponents into the top bar.
    // Opponents' cards are rendered for one layout only, because each card
    // must appear once for its animations to work.
    let short = useMediaQuery("(max-height: 560px)");
    let me = view.seats[view.seat];
    let opponents = opponentSeats(view);
    let isPlaying = (seat) => view.turn === seat && (view.phase === "draw" || view.phase === "play");
    let myTurn = isPlaying(view.seat);
    let drawing = myTurn && view.phase === "draw";
    let playing = myTurn && view.phase === "play";
    let building = playing && me.isDown;
    let selectedCard = (playing && selected !== null) ? hand[selected] : null;

    // what adding the selected card to a setrun would do
    let targetFor = (setrun, owner) => {
        if (!building || !selectedCard) return null;
        let result = addToSetrun(setrun, selectedCard);
        if (!result.valid) return null;
        return result.returnedAce
            ? {label : "Swap for " + shortName(result.returnedAce), returnedAce : result.returnedAce, owner}
            : {label : "Add " + shortName(selectedCard), owner};
    }
    let targets = view.seats.map((player, seat) => player.table.map(setrun =>
        targetFor(setrun, ((seat === view.seat) ? "your " : player.name + "'s ") + setrun.type.toLowerCase())));
    let allTargets = targets.flat().filter(Boolean);
    let swap = allTargets.find(target => target.returnedAce);

    let allSetruns = view.seats.flatMap(player => player.table);
    let playable = hand.map(card => building && allSetruns.some(setrun => addToSetrun(setrun, card).valid));
    let canGoDown = playing && !me.isDown && planGoDown(hand, view.requirement) !== null;

    let turn = describeTurn({view, selected : selectedCard, targets : allTargets.length, swap, playable, canGoDown});

    let melds = (seat) => view.seats[seat].table.map((setrun, setrunIndex) => (
        <Meld
            key={setrunIndex}
            setrun={setrun}
            target={targets[seat][setrunIndex]}
            dimmed={Boolean(selectedCard) && building && !targets[seat][setrunIndex]}
            onClick={() => actions.addToMeld(seat, setrunIndex)}
        />
    ));

    let discardAction = null;
    if (drawing && view.discard.length > 0) {
        discardAction = {chip : "Take", ariaLabel : "Take " + longName(view.discard[0]), onClick : actions.takeDiscard};
    } else if (selectedCard && !view.claim) {
        discardAction = {chip : "Discard " + shortName(selectedCard), ariaLabel : "Discard " + longName(selectedCard) + " and end your turn", onClick : actions.discard};
    }
    let claim = view.claim?.canAnswer
        ? {card : view.claim.card, closesIn : view.claim.closesIn, onClaim : actions.claim, onPass : actions.pass}
        : null;

    let goDownHint;
    if (me.isDown) goDownHint = "You're down this round";
    else if (drawing) goDownHint = "Draw a card first";
    else if (!myTurn) goDownHint = "You can go down on your turn";
    else if (canGoDown) goDownHint = "You have what you need!";
    else goDownHint = "Need " + requirementText(view.requirement);

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
                    active : isPlaying(seat),
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
                            active={isPlaying(seat)}
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
                    {short && (opponents.some(seat => view.seats[seat].isDown)
                        ? opponents.map(seat => view.seats[seat].isDown && (
                            <div key={seat} className="flex items-start gap-1.5">
                                <span
                                    aria-hidden="true"
                                    className="mt-2.5 grid size-5 flex-none place-items-center rounded-full text-[11px] font-bold text-white"
                                    style={{backgroundColor : aiColor(opponentIndex(view, seat))}}
                                >
                                    {opponentIndex(view, seat) + 1}
                                </span>
                                <span className="sr-only">{view.seats[seat].name}</span>
                                <div className="flex flex-wrap gap-1.5">{melds(seat)}</div>
                            </div>
                        ))
                        : <p className="my-auto text-sm text-muted-foreground">No opponent is down yet.</p>)}
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
                        deckActive={drawing && view.deck.canDraw}
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
                    <PlayerPanel active={myTurn} isDown={me.isDown} score={me.total} cardCount={hand.length} />
                </div>

                <div className="flex min-w-0 flex-col items-center gap-2.5 short:gap-1">
                    <TurnPrompt steps={turn.steps} text={turn.text} notice={notice} />
                    <Hand
                        key={view.round}
                        cards={hand}
                        selected={playing ? selected : null}
                        selectable={playing}
                        newCard={newCard}
                        playable={playable}
                        onSelect={actions.select}
                        onReorder={actions.reorder}
                    />
                </div>

                <div className="mb-4 flex flex-col gap-3 short:mb-2 short:gap-1.5">
                    <div role="group" aria-labelledby="sort-hand" className="flex flex-col gap-1.5">
                        <span id="sort-hand" className={cn(sectionLabel, "short:hidden")}>Sort hand</span>
                        <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1 short:grid-cols-1">
                            <Button variant="ghost" onClick={actions.sortByValue} className="short:h-9 short:text-sm">By value</Button>
                            <Button variant="ghost" onClick={actions.sortBySuit} className="short:h-9 short:text-sm">By suit</Button>
                        </div>
                    </div>
                    <Button
                        size="lg"
                        variant={canGoDown ? "default" : "secondary"}
                        disabled={!playing || me.isDown}
                        onClick={actions.openGoDown}
                        className={cn(canGoDown && "pulse-gold", "short:h-10")}
                    >
                        Go down
                    </Button>
                    <span className="text-center text-[13px] text-muted-foreground short:hidden">{goDownHint}</span>
                </div>
            </section>

            <ScoresDialog open={dialog === "scores"} onOpenChange={(open) => setDialog(open ? "scores" : null)} view={view} />
            <RulesDialog open={dialog === "rules"} onOpenChange={(open) => setDialog(open ? "rules" : null)} />
            <RotatePrompt />
        </div>
    );
}

export default GameTable;
