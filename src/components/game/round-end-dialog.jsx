import {Button} from '@/components/ui/button.jsx';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog.jsx';
import {ROUND_REQUIREMENTS} from '@/engine/cards.ts';
import {requirementText} from '@/engine/card-names.ts';
import Scoreboard from './scoreboard.jsx';
import {scoreRows} from './scores.js';
import {opponentSeats} from './players.js';

const keepOpen = (event) => event.preventDefault();

// Shown when a round ends. After the last round it names the winner (lowest
// total) and offers a new game. The next round is dealt once everyone is
// ready, so once you are, it says who it's waiting for.
function RoundEndDialog({view, onReady, onNewGame}) {
    if (view.phase !== "roundEnd" && view.phase !== "gameEnd") return null;

    let {round, rounds : roundCount} = view;
    let rows = scoreRows(view, true);
    let isFinalRound = view.phase === "gameEnd";
    let ranked = [...rows].sort((a, b) => a.total - b.total);
    let leader = ranked[0];
    let you = rows[0];
    let wentOut = rows.find(row => row.wentOut);
    let ready = view.seats[view.seat].ready;
    let waitingFor = opponentSeats(view).filter(seat => !view.seats[seat].ready).map(seat => view.seats[seat].name);

    let eyebrow = isFinalRound ? "Game over" : "Round " + (round + 1) + " of " + roundCount + " complete";
    let title;
    if (isFinalRound) {
        title = leader.isYou ? "You win!" : leader.name + " wins";
    } else if (wentOut) {
        title = wentOut.isYou ? "You went out!" : wentOut.name + " went out";
    } else {
        title = "The deck ran out";
    }
    let standing = (you.total === leader.total)
        ? (isFinalRound ? "Lowest total wins." : "You're in the lead.")
        : "You're " + (you.total - leader.total) + " points behind " + leader.name + ".";

    return (
        <Dialog open>
            <DialogContent
                showCloseButton={false}
                onEscapeKeyDown={keepOpen}
                onPointerDownOutside={keepOpen}
                className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[880px]"
            >
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <DialogHeader>
                        <span className="text-[13px] font-bold tracking-widest text-muted-foreground uppercase">{eyebrow}</span>
                        <DialogTitle className="text-3xl">{title}</DialogTitle>
                        <DialogDescription>
                            {view.wentOut === null && "Nobody went out before the deck ran out for the third time. "}
                            Cards left in hand count against you. Lowest total after round {roundCount} wins.
                        </DialogDescription>
                    </DialogHeader>
                    {!isFinalRound && (
                        <div className="flex flex-col items-end gap-1 rounded-xl bg-white/6 px-3.5 py-2.5">
                            <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Next up</span>
                            <span className="font-bold">Round {round + 2} · {requirementText(ROUND_REQUIREMENTS[round + 1])}</span>
                        </div>
                    )}
                </div>
                <Scoreboard rows={rows} roundCount={roundCount} highlightRound={round} />
                <DialogFooter>
                    <span className="text-sm text-muted-foreground sm:mr-auto">{standing}</span>
                    {isFinalRound && <Button size="lg" onClick={onNewGame}>New game</Button>}
                    {!isFinalRound && !ready && <Button size="lg" onClick={onReady}>Start round {round + 2}</Button>}
                    {!isFinalRound && ready && <Button size="lg" disabled>Waiting for {waitingFor.join(", ")}</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default RoundEndDialog;
