import {useShortScreen} from '@/lib/use-media-query.ts';
import {Button} from '@/components/ui/button.tsx';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog.tsx';
import {ROUND_REQUIREMENTS} from '@/engine/cards.ts';
import {requirementText} from '@/engine/card-names.ts';
import type {CharacterId} from '@/engine/cast.ts';
import type {GameView} from '@/engine/view.ts';
import type {GameRecord} from '@/storage/history.ts';
import Scoreboard from './scoreboard.tsx';
import {scoreRows} from './scores.ts';
import type {Bubble} from './speech-bubble.tsx';
import {opponentSeats} from './players.ts';
import {gameResult, percent} from './stats.ts';
import {PlaceStrip} from './stats-screen.tsx';

const keepOpen = (event: {preventDefault(): void}) => event.preventDefault();

// Your wins and games so far, and where you finished in the last ten, this one last.
function YourRecord({record}: {record: GameRecord[]}) {
    let results = record.map(gameResult);
    let wins = results.filter(result => result.won).length;
    let games = results.length;
    return (
        <div className="flex flex-col gap-1.5 rounded-xl bg-white/6 px-3.5 py-2.5 short:gap-1 short:px-3 short:py-1.5">
            <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase short:text-[10.5px]">Your record</span>
            <span className="font-bold short:text-sm">
                {wins} {(wins === 1) ? "win" : "wins"} in {games} {(games === 1) ? "game" : "games"} · {percent(wins, games)}%
            </span>
            <PlaceStrip
                places={results.slice(-10).map(result => result.place)}
                markLast
                className="gap-0.75"
                cellClassName="h-5 w-4.5 rounded text-[11px]"
            />
        </div>
    );
}

interface RoundEndDialogProps {
    view: GameView;
    /** who sits in each seat, by seat */
    characters?: (CharacterId | null)[];
    /** what each opponent is saying, by seat, shown on the scoreboard (the table's behind the dialog) */
    speech?: Record<number, Bubble | null>;
    /** at the end of the game: your finished games, this one last, once they're loaded */
    record: GameRecord[] | null;
    onReady: () => void;
    onNewGame: () => void;
    onShowStats: () => void;
}

// Shown when a round ends. After the last round it names the winner (lowest
// total), shows your record, and offers a new game or your stats. The next
// round is dealt once everyone is ready, so once you are, it says who it's
// waiting for. On a phone it fills the screen: the result on the left, the
// scores on the right.
function RoundEndDialog({view, characters = [], speech, record, onReady, onNewGame, onShowStats}: RoundEndDialogProps) {
    let short = useShortScreen();
    if (view.phase !== "roundEnd" && view.phase !== "gameEnd") return null;

    let {round, rounds : roundCount} = view;
    let rows = scoreRows(view, true, characters);
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
    // the ranking puts you first among equals
    let runnerUp = ranked[1];
    let standing;
    if (!isFinalRound) {
        standing = (you.total === leader.total)
            ? "You're in the lead."
            : "You're " + (you.total - leader.total) + " points behind " + leader.name + ".";
    } else if (!leader.isYou) {
        standing = "You finished " + (you.total - leader.total) + " points behind " + leader.name + ".";
    } else if (runnerUp.total === you.total) {
        standing = "You tied with " + runnerUp.name + " for the lowest total.";
    } else {
        standing = "You finished " + (runnerUp.total - you.total) + " points ahead of " + runnerUp.name + ".";
    }

    let button;
    if (isFinalRound) {
        // New game has the focus, as the dialog opens
        let newGame = <Button size="lg" autoFocus onClick={onNewGame} className="short:h-11 short:px-2">New game</Button>;
        let stats = <Button size="lg" variant="outline" onClick={onShowStats} className="short:h-11 short:px-2">Your stats</Button>;
        // on a phone side by side under the result, New game first
        button = short
            ? <div className="grid grid-cols-2 gap-2">{newGame}{stats}</div>
            : <div className="flex gap-2">{stats}{newGame}</div>;
    } else if (!ready) {
        button = <Button size="lg" onClick={onReady}>Start round {round + 2}</Button>;
    } else {
        button = <Button size="lg" disabled>Waiting for {waitingFor.join(", ")}</Button>;
    }
    let yourRecord = isFinalRound && record && record.length > 0 && <YourRecord record={record} />;
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
                            {isFinalRound
                                ? "Lowest total wins. "
                                : (points === 0) ? "You scored nothing this round. " : "You were left holding " + points + " points. "}
                            {standing}
                        </DialogDescription>
                        {nextUp}
                        {yourRecord}
                        <span className="flex-1" />
                        {button}
                    </div>
                    <div className="min-h-0 self-center overflow-y-auto">
                        <Scoreboard rows={rows} roundCount={roundCount} highlightRound={round} compact speech={speech} />
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
                    {yourRecord}
                </div>
                <Scoreboard rows={rows} roundCount={roundCount} highlightRound={round} speech={speech} />
                <DialogFooter>
                    <span className="text-sm text-muted-foreground sm:mr-auto">{standing}</span>
                    {button}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default RoundEndDialog;
