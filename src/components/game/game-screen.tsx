import {useEffect, useMemo, useState} from 'react';
import {Button} from '@/components/ui/button.tsx';
import {runEnds} from '@/engine/setruns.ts';
import type {GameClient} from '@/client/game-client.ts';
import {useGame} from '@/client/use-game.ts';
import type {Preferences} from '@/storage/settings.ts';
import type {GameRecord} from '@/storage/history.ts';
import GameTable from './game-table.tsx';
import GoDownDialog, {type GoDownSlot} from './go-down-dialog.tsx';
import RoundEndDialog from './round-end-dialog.tsx';
import PauseDialog from './pause-dialog.tsx';
import SettingsDialog from './settings-dialog.tsx';
import {FLIGHTS, FlightContext} from './flight.ts';
import {yourTurn} from './your-turn.ts';
import {TableContext, type TableActions, type TableDialog} from './table-context.ts';
import {useBubbles, useHandOrder, useLookTime, useLostClaim, useNotice, useRecord, useSounds} from './screen-hooks.ts';

// The game has moved on to a newer version than this page: a page left open
// from before an update, playing a game online. A reload brings the page up
// to date.
function Updated() {
    return (
        <main className="grid h-dvh place-items-center bg-felt p-6 text-center">
            <div className="flex max-w-md flex-col items-center gap-4">
                <h1 className="font-heading text-3xl font-extrabold">Crafty Clara has been updated</h1>
                <p className="text-muted-foreground">Reload the page to carry on playing.</p>
                <Button size="lg" onClick={() => window.location.reload()}>Reload</Button>
            </div>
        </main>
    );
}

/** Stops and restarts the whole game (for now, a game in this page against bots). */
export interface Pausing {
    pause(): void;
    resume(): void;
}

interface GameScreenProps {
    client: GameClient;
    pausing: Pausing;
    /** how you like the game: hints, table talk, speed and sound */
    prefs: Preferences;
    /** a change in the settings; App passes a new speed on to the game */
    onPrefsChange: (changes: Partial<Preferences>) => void;
    /** your finished games, for your record when this one ends */
    games: () => Promise<GameRecord[]>;
    onNewGame: () => void;
    onShowStats: () => void;
}

// A game in progress, as your seat sees it through the client. Everything
// here besides the view is yours alone: how your hand is sorted, the card
// you've selected, and the open dialogs. Moves go to the host as commands.
// The table's pieces read the game from the table context.
//
// Nothing in the game moves while you've paused it, or while you're reading
// the scores, the rules or the settings. Leaving the page (for another tab,
// or another app on a phone) pauses it, so you come back to the Paused dialog.
function GameScreen({client, pausing, prefs, onPrefsChange, games, onNewGame, onShowStats}: GameScreenProps) {
    let {status, seats : sitting, view, refusal, talk, send} = useGame(client);
    // the table talk you see: none, the big moments, or all of it
    let seat = view?.seat;
    let heard = useMemo(
        () => talk.filter(said => said.seat !== seat && (prefs.talk === "chatty" || (prefs.talk === "quiet" && said.big))),
        [talk, prefs.talk, seat]
    );
    let speech = useBubbles(heard);
    useSounds(view, prefs.sound);
    let {hand, sort, reorder, sortHand} = useHandOrder(view);
    let [selectedId, setSelectedId] = useState<string | null>(null);
    // a card being dragged counts as the selected one, so the table shows where it can go
    let [draggingId, setDraggingId] = useState<string | null>(null);
    let [goingDown, setGoingDown] = useState(false);
    // the run a card could go at either end of, while it asks which
    let [choosing, setChoosing] = useState<{seat: number; index: number; card: string} | null>(null);
    let [paused, setPaused] = useState(false);
    let [dialog, setDialog] = useState<TableDialog | null>(null);
    let refused = useNotice(refusal);
    let lost = useLostClaim(view);
    let notice = refused ?? lost;
    let record = useRecord(view?.phase === "gameEnd", games);

    let held = paused || dialog !== null;
    let lookLeft = useLookTime(view?.look ?? null, held);
    useEffect(() => {
        if (held) pausing.pause();
        else pausing.resume();
    }, [held, pausing]);

    // between rounds there's nothing to pause
    let playing = view?.phase === "look" || view?.phase === "draw" || view?.phase === "play";
    useEffect(() => {
        // already held by an open dialog, which is still there when you come back
        if (!playing || dialog !== null) return;
        let leave = () => {
            if (document.hidden) setPaused(true);
        };
        document.addEventListener("visibilitychange", leave);
        return () => document.removeEventListener("visibilitychange", leave);
    }, [playing, dialog]);

    if (status === "mismatch") return <Updated />;
    if (!view) return <div className="h-dvh bg-felt" />;

    // who sits where, as the host said when it welcomed you
    let seats = sitting ?? view.seats.map(() => ({level : null, character : null}));
    let me = view.seats[view.seat];
    let selectedIndex = hand.findIndex(card => card.id === (draggingId ?? selectedId));
    let turn = yourTurn(view, hand, (selectedIndex === -1) ? null : selectedIndex, prefs.hints);
    let selected = turn.selected?.card;
    let endChoice = null;
    if (choosing && selected?.id === choosing.card) {
        let places = runEnds(view.seats[choosing.seat].table[choosing.index], selected);
        if (places.length > 1) endChoice = {seat : choosing.seat, index : choosing.index, choice : {card : selected, places}};
    }

    let actions: TableActions = {
        start : () => send({type : "start"}),
        drawFromDeck : () => send({type : "draw", from : "deck"}),
        takeDiscard : () => send({type : "draw", from : "discard"}),
        claim : () => send({type : "claim"}),
        pass : () => send({type : "pass"}),
        discard : () => {
            if (!selected) return;
            send({type : "discard", card : selected.id});
            setSelectedId(null);
        },
        addToMeld : (seat, index) => {
            if (!selected) return false;
            // a card that could go at either end of a run asks which first
            let setrun = view.seats[seat].table[index];
            if (setrun && runEnds(setrun, selected).length > 1) {
                setSelectedId(selected.id);
                setChoosing({seat, index, card : selected.id});
                return false;
            }
            send({type : "addToSetrun", card : selected.id, target : {seat, index}});
            setSelectedId(null);
            return true;
        },
        chooseEnd : (end) => {
            if (!endChoice) return;
            send({type : "addToSetrun", card : endChoice.choice.card.id, target : {seat : endChoice.seat, index : endChoice.index}, end});
            setSelectedId(null);
            setChoosing(null);
        },
        cancelChoice : () => setChoosing(null),
        select : (index) => {
            if (!turn.playing) return;
            setSelectedId(hand[index].id);
            setChoosing(null);
        },
        drag : (index) => setDraggingId((index === null) ? null : hand[index].id),
        reorder,
        sortHand,
        pause : () => setPaused(true),
        openGoDown : () => {
            setSelectedId(null);
            setGoingDown(true);
        },
        showDialog : setDialog
    };

    let goDown = (slots: GoDownSlot[]) => {
        send({type : "goDown", setruns : slots.map(slot => ({
            type : slot.type,
            cards : slot.indices.map(index => hand[index].id),
            ...((slot.from === undefined) ? {} : {from : slot.from})
        }))});
        setGoingDown(false);
    };

    let characters = seats.map(seat => seat.character);
    // cards fly at the game's speed
    return (
        <TableContext value={{view, seats, hand, turn, actions}}>
            <FlightContext value={FLIGHTS[prefs.speed]}>
                <GameTable
                    sort={sort}
                    paused={held}
                    dialog={dialog}
                    lookLeft={lookLeft}
                    endChoice={endChoice}
                    speech={speech}
                    talk={heard}
                    notice={notice}
                />
                <GoDownDialog
                    open={goingDown && turn.playing && !me.isDown}
                    hand={hand}
                    requirement={view.requirement}
                    onCancel={() => setGoingDown(false)}
                    onSubmit={goDown}
                />
                <RoundEndDialog view={view} characters={characters} speech={speech} record={record} onReady={() => send({type : "ready"})} onNewGame={onNewGame} onShowStats={onShowStats} />
                <PauseDialog open={paused} onResume={() => setPaused(false)} />
                <SettingsDialog
                    open={dialog === "settings"}
                    onOpenChange={(open) => setDialog(open ? "settings" : null)}
                    prefs={prefs}
                    onPrefsChange={onPrefsChange}
                    inGame
                />
            </FlightContext>
        </TableContext>
    );
}

export default GameScreen;
