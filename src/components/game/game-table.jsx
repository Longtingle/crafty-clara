import {useState} from 'react';
import {cn} from '@/lib/utils.js';
import {Button} from '@/components/ui/button.jsx';
import GAME_STATES, {ROUND_REQUIREMENTS} from '@/store/constants.js';
import {addToSetrun} from '@/game-functions/hand-functions.js';
import AIFunctions from '@/game-functions/AI-functions.js';
import {shortName, longName, requirementText} from '@/game-functions/card-names.js';
import TopBar from './top-bar.jsx';
import {OpponentPanel} from './opponent-panel.jsx';
import Meld from './meld.jsx';
import Piles from './piles.jsx';
import ActivityLog from './activity-log.jsx';
import PlayerPanel from './player-panel.jsx';
import TurnPrompt from './turn-prompt.jsx';
import Hand from './hand.jsx';
import ScoresDialog from './scores-dialog.jsx';
import RulesDialog from './rules-dialog.jsx';
import RotatePrompt from './rotate-prompt.jsx';
import {aiColor} from './players.js';

// While the AI in play waits after drawing from the deck, the top discard can be claimed.
const CLAIM_STATES = [GAME_STATES.AI_WAIT_ONE, GAME_STATES.AI_DRAW_OOT, GAME_STATES.AI_WAIT_TWO];

const sectionLabel = "text-[13px] font-bold tracking-widest text-muted-foreground uppercase";

// What the turn prompt says, and which turn step is current.
const describeTurn = ({state, selected, targets, swap, playable, canGoDown, claimWindow}) => {
    let {game, player, AI, discard} = state;
    let middle = player.isDown ? "Add to melds" : "Go down";

    if (game.gameState === GAME_STATES.PW_DRAW_CARD) {
        return {
            steps : [{label : "Draw", state : "current"}, {label : middle, state : "todo"}, {label : "Discard", state : "todo"}],
            text : discard.length > 0
                ? "Your turn. Draw from the deck or take the " + shortName(discard[0]) + "."
                : "Your turn. Draw from the deck."
        };
    }

    if (game.gameState === GAME_STATES.PW_PLAY) {
        let steps = [
            {label : "Draw", state : "done"},
            {label : middle, state : selected ? "todo" : "current"},
            {label : "Discard", state : selected ? "current" : "todo"}
        ];
        let text;
        if (!selected) {
            if (player.isDown) {
                text = "Select a card to add to a meld or discard." +
                    (playable.some(Boolean) ? " Gold dots mark cards that fit." : "");
            } else if (canGoDown) {
                text = "You have what you need. Go down, or select a card to discard.";
            } else {
                text = "Select a card to discard. To go down you need " + requirementText(game.requirement) + ".";
            }
        } else if (swap) {
            text = shortName(selected) + " can replace the wild " + shortName(swap.returnedAce) + " in " + swap.owner +
                ", and the ace comes back to you.";
        } else if (targets > 0) {
            text = "Add " + shortName(selected) + " to a highlighted meld, or discard it to end your turn.";
        } else if (player.isDown) {
            text = shortName(selected) + " doesn't fit any meld. Discard it to end your turn.";
        } else {
            text = "Discard " + shortName(selected) + " to end your turn, or pick another card.";
        }
        return {steps, text};
    }

    if (game.gameState === GAME_STATES.ROUND_END) return {steps : null, text : "Round over."};

    let name = (AI.AIInPlay !== null) ? AI.players[AI.AIInPlay].name : "Your opponents";
    if (claimWindow && state.playerClaim) {
        return {steps : null, text : "Claimed the " + shortName(discard[0]) + ". It's yours unless someone earlier in the order claims it too."};
    }
    if (claimWindow) {
        return {steps : null, text : name + " drew from the deck. Claim the " + shortName(discard[0]) + " before they play on?"};
    }
    return {steps : null, text : name + " is playing."};
}

// The whole table: opponents along the top, piles in the middle, your hand at
// the bottom. All game actions go through `actions` (handlers on App).
function GameTable({state, actions}) {
    let [dialog, setDialog] = useState(null);
    let {game, player, AI, deck, discard, log} = state;
    let drawing = game.gameState === GAME_STATES.PW_DRAW_CARD;
    let playing = game.gameState === GAME_STATES.PW_PLAY;
    let myTurn = drawing || playing;
    let building = playing && player.isDown;
    let selected = (playing && player.cardSelected !== null) ? player.hand[player.cardSelected] : null;
    let claimWindow = CLAIM_STATES.includes(game.gameState) && !state.discardCovered && discard.length > 0;

    // what adding the selected card to a setrun would do
    let targetFor = (setrun, owner) => {
        if (!building || !selected) return null;
        let result = addToSetrun(setrun, selected);
        if (!result.valid) return null;
        return result.returnedAce
            ? {label : "Swap for " + shortName(result.returnedAce), returnedAce : result.returnedAce, owner}
            : {label : "Add " + shortName(selected), owner};
    }
    let ownerName = (AIIndex, setrun) => AI.players[AIIndex].name + "'s " + setrun.type.toLowerCase();
    let myTargets = player.table.map(setrun => targetFor(setrun, "your " + setrun.type.toLowerCase()));
    let AITargets = AI.players.map((AIPlayer, AIIndex) =>
        AIPlayer.table.map(setrun => targetFor(setrun, ownerName(AIIndex, setrun))));
    let allTargets = [...myTargets, ...AITargets.flat()].filter(Boolean);
    let swap = allTargets.find(target => target.returnedAce);

    let allSetruns = [...player.table, ...AI.players.flatMap(AIPlayer => AIPlayer.table)];
    let playable = player.hand.map(card => building && allSetruns.some(setrun => addToSetrun(setrun, card).valid));
    let canGoDown = playing && !player.isDown && AIFunctions.canGoDown(player.hand, game.requirement).result;

    let turn = describeTurn({state, selected, targets : allTargets.length, swap, playable, canGoDown, claimWindow});

    let meld = (setrun, target, key, onClick) => (
        <Meld key={key} setrun={setrun} target={target} dimmed={Boolean(selected) && building && !target} onClick={onClick} />
    );
    let AIMelds = (AIIndex) => AI.players[AIIndex].table.map((setrun, setrunIndex) =>
        meld(setrun, AITargets[AIIndex][setrunIndex], setrunIndex, () => actions.addToMeld("AI", setrunIndex, AIIndex)));
    let lastAction = (AIIndex) => log.find(entry => entry.actor === AIIndex)?.text ?? null;

    let discardAction = null;
    if (drawing && discard.length > 0) {
        discardAction = {chip : "Take", ariaLabel : "Take " + longName(discard[0]), onClick : actions.discardClick};
    } else if (selected) {
        discardAction = {chip : "Discard " + shortName(selected), ariaLabel : "Discard " + longName(selected) + " and end your turn", onClick : actions.discardClick};
    }

    let goDownHint;
    if (player.isDown) goDownHint = "You're down this round";
    else if (drawing) goDownHint = "Draw a card first";
    else if (!myTurn) goDownHint = "You can go down on your turn";
    else if (canGoDown) goDownHint = "You have what you need!";
    else goDownHint = "Need " + requirementText(game.requirement);

    return (
        <div className="relative grid h-dvh grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden bg-felt shadow-[inset_0_0_180px_rgb(0_0_0/0.4)] short:grid-rows-[auto_minmax(0,1fr)_auto]">
            <TopBar
                round={game.round}
                roundCount={ROUND_REQUIREMENTS.length}
                requirement={game.requirement}
                requirementMet={player.isDown}
                opponents={AI.players.map((AIPlayer, index) => ({
                    index,
                    name : AIPlayer.name,
                    count : AIPlayer.hand.length,
                    isDown : AIPlayer.isDown,
                    active : !myTurn && AI.AIInPlay === index
                }))}
                onShowScores={() => setDialog("scores")}
                onShowRules={() => setDialog("rules")}
            />

            <section
                aria-label="Opponents"
                className="grid gap-5 px-6 pt-3 compact:pt-2 short:hidden"
                style={{gridTemplateColumns : `repeat(${AI.players.length}, minmax(0, 1fr))`}}
            >
                {AI.players.map((AIPlayer, AIIndex) => (
                    <OpponentPanel
                        key={AIIndex}
                        player={AIPlayer}
                        index={AIIndex}
                        active={!myTurn && AI.AIInPlay === AIIndex}
                        lastAction={lastAction(AIIndex)}
                    >
                        {AIMelds(AIIndex)}
                    </OpponentPanel>
                ))}
            </section>

            <section className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 px-6 [grid-template-areas:'mine_piles_log'] short:gap-3 short:px-3 short:[grid-template-areas:'opps_piles_mine']">
                <div className="hidden min-w-0 flex-wrap content-start gap-x-3 gap-y-2 self-stretch overflow-y-auto py-2 [scrollbar-width:thin] [--meld-w:34px] [grid-area:opps] short:flex">
                    {AI.players.some(AIPlayer => AIPlayer.isDown)
                        ? AI.players.map((AIPlayer, AIIndex) => AIPlayer.isDown && (
                            <div key={AIIndex} className="flex items-start gap-1.5">
                                <span
                                    aria-hidden="true"
                                    className="mt-2.5 grid size-5 flex-none place-items-center rounded-full text-[11px] font-bold text-white"
                                    style={{backgroundColor : aiColor(AIIndex)}}
                                >
                                    {AIIndex + 1}
                                </span>
                                <span className="sr-only">{AIPlayer.name}</span>
                                <div className="flex flex-wrap gap-1.5">{AIMelds(AIIndex)}</div>
                            </div>
                        ))
                        : <p className="my-auto text-sm text-muted-foreground">No opponent is down yet.</p>}
                </div>

                <div className="flex min-w-0 flex-col gap-2.5 self-end pb-1 [grid-area:mine] short:items-end short:self-center">
                    <h2 className={cn(sectionLabel, "short:hidden")}>Your melds</h2>
                    {player.isDown
                        ? (
                            <div className="flex flex-wrap gap-3.5 short:justify-end short:gap-2">
                                {player.table.map((setrun, setrunIndex) =>
                                    meld(setrun, myTargets[setrunIndex], setrunIndex, () => actions.addToMeld("player", setrunIndex)))}
                            </div>
                        )
                        : (
                            <div className="grid h-(--meld-row) w-full max-w-80 place-items-center rounded-xl border-2 border-dashed border-white/18 px-4 text-center text-sm text-muted-foreground">
                                Your melds go here once you go down
                            </div>
                        )}
                </div>

                <div className="[grid-area:piles]">
                    <Piles
                        deckCount={deck.length}
                        deckActive={drawing}
                        onDeckClick={actions.deckClick}
                        discardTop={discard[0]}
                        discardAction={discardAction}
                        claim={claimWindow ? {card : discard[0], claimed : state.playerClaim, onClaim : actions.claimDiscard} : null}
                    />
                </div>

                <div className="flex justify-end [grid-area:log] short:hidden">
                    <ActivityLog log={log} AIPlayers={AI.players} />
                </div>
            </section>

            <section className="grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,15rem)] items-end gap-6 px-6 pb-4 short:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_minmax(0,8rem)] short:gap-3 short:px-3 short:pb-2">
                <div className="mb-4 short:mb-2">
                    <PlayerPanel active={myTurn} isDown={player.isDown} score={player.points.total} cardCount={player.hand.length} />
                </div>

                <div className="flex min-w-0 flex-col items-center gap-2.5 short:gap-1">
                    <TurnPrompt steps={turn.steps} text={turn.text} />
                    <Hand
                        cards={player.hand}
                        selected={playing ? player.cardSelected : null}
                        selectable={playing}
                        newCard={player.newCard}
                        playable={playable}
                        onSelect={actions.selectCard}
                        onReorder={actions.reorderHand}
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
                        disabled={!playing || player.isDown}
                        onClick={actions.openGoDown}
                        className={cn(canGoDown && "pulse-gold", "short:h-10")}
                    >
                        Go down
                    </Button>
                    <span className="text-center text-[13px] text-muted-foreground short:hidden">{goDownHint}</span>
                </div>
            </section>

            <ScoresDialog
                open={dialog === "scores"}
                onOpenChange={(open) => setDialog(open ? "scores" : null)}
                player={player}
                AIPlayers={AI.players}
            />
            <RulesDialog open={dialog === "rules"} onOpenChange={(open) => setDialog(open ? "rules" : null)} />
            <RotatePrompt />
        </div>
    );
}

export default GameTable;
