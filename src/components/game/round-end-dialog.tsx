import {useMediaQuery} from '@/lib/use-media-query.ts';
import {Button} from '@/components/ui/button.tsx';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog.tsx';
import {ROUND_REQUIREMENTS} from '@/engine/cards.ts';
import {requirementText} from '@/engine/card-names.ts';
import type {GameView} from '@/engine/view.ts';
import Scoreboard from './scoreboard.tsx';
import {scoreRows} from './scores.ts';
import {opponentSeats} from './players.ts';

const keepOpen = (event: {preventDefault(): void}) => event.preventDefault();

interface RoundEndDialogProps {
    view: GameView;
    onReady: () => void;
    onNewGame: () => void;
}

// Shown when a round ends. After the last round it names the winner (lowest
// total) and offers a new game. The next round is dealt once everyone is
// ready, so once you are, it says who it's waiting for. On a phone it fills
// the screen: the result on the left, the scores on the right.
function RoundEndDialog({view, onReady, onNewGame}: RoundEndDialogProps) {
    let short = useMediaQuery("(max-height: 560px)");
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

    let button;
    if (isFinalRound) button = <Button size="lg" onClick={onNewGame}>New game</Button>;
    else if (!ready) button = <Button size="lg" onClick={onReady}>Start round {round + 2}</Button>;
    else button = <Button size="lg" disabled>Waiting for {waitingFor.join(", ")}</Button>;
    let nextUp = !isFinalRound && (
        <div className="flex flex-col items-end gap-1 rounded-xl bg-white/6 px-3.5 py-2.5 short:items-start short:gap-0.5 short:px-3 short:py-2">
            <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase short:text-[10.5px]">Next up</span>
            <span className="font-bold short:text-sm">Round {round + 2} · {requirementText(ROUND_REQUIREMENTS[round + 1])}</span>
        </div>
    );

    if (short) {
        let points = you.points[round] ?? 0;
        return (
            <Dialog open>
                <DialogContent
                    showCloseButton={false}
                    onEscapeKeyDown={keepOpen}
                    onPointerDownOutside={keepOpen}
                    className="top-0 left-0 grid h-dvh max-w-none translate-x-0 translate-y-0 grid-cols-[min(15rem,32vw)_minmax(0,1fr)] gap-5 rounded-none bg-card px-5 py-4 ring-0 sm:max-w-none"
                >
                    <div className="flex min-h-0 flex-col gap-2">
                        <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{eyebrow}</span>
                        <DialogTitle className="text-[28px] leading-none">{title}</DialogTitle>
                        <DialogDescription className="text-[13px] leading-snug">
                            {view.wentOut === null && "Nobody went out before the deck ran out for the third time. "}
                            {(points === 0) ? "You scored nothing this round. " : "You were left holding " + points + " points. "}
                            {standing}
                        </DialogDescription>
                        {nextUp}
                        <span className="flex-1" />
                        {button}
                    </div>
                    <div className="min-h-0 self-center overflow-y-auto">
                        <Scoreboard rows={rows} roundCount={roundCount} highlightRound={round} compact />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

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
                    {nextUp}
                </div>
                <Scoreboard rows={rows} roundCount={roundCount} highlightRound={round} />
                <DialogFooter>
                    <span className="text-sm text-muted-foreground sm:mr-auto">{standing}</span>
                    {button}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default RoundEndDialog;
