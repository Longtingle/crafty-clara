import {useEffect, useState} from 'react';
import type {BotLevel} from '@/engine/bot.ts';
import type {LookView} from '@/engine/view.ts';
import {runEnds} from '@/engine/setruns.ts';
import type {GameClient, Refusal} from '@/client/game-client.ts';
import {useGame} from '@/client/use-game.ts';
import type {Hints} from '@/storage/settings.ts';
import type {GameRecord} from '@/storage/history.ts';
import GameTable, {type TableActions, type TableDialog} from './game-table.tsx';
import GoDownDialog, {type GoDownSlot} from './go-down-dialog.tsx';
import RoundEndDialog from './round-end-dialog.tsx';
import PauseDialog from './pause-dialog.tsx';
import SettingsDialog from './settings-dialog.tsx';
import {opponentSeats} from './players.ts';
import {newCardTag, speechFor} from './log-text.ts';
import {yourTurn} from './your-turn.ts';
import {moveCard, orderHand, type HandSort} from './hand-order.ts';

// How long an opponent's line of speech, and a refused move's notice, stay up (ms).
const SPEECH_MS = 2000;
const NOTICE_MS = 3000;

// What each opponent is saying, by seat: a line for a moment after some
// moves, and a grumble from one of them as each round is dealt. It listens to
// the client, so it hears each new log entry as it arrives.
function useSpeech(client: GameClient): Record<number, string | null> {
    let [lines, setLines] = useState<Record<number, string | null>>({});

    useEffect(() => {
        let timers: Record<number, ReturnType<typeof setTimeout>> = {};
        // the round and how much of its log has been heard
        let heard = {round : -1, count : 0};
        let current = client.getSnapshot().view;
        if (current) heard = {round : current.round, count : current.log.length};

        let stop = client.subscribe(() => {
            let view = client.getSnapshot().view;
            if (!view) return;
            let {round, log} = view;
            let newRound = heard.round !== round;
            let fresh = newRound ? log : log.slice(heard.count);
            heard = {round, count : log.length};

            let said = fresh.flatMap(entry => speechFor(entry, view));
            if (newRound && log.length === 0) {
                let opponents = opponentSeats(view);
                said.push([opponents[Math.floor(Math.random() * opponents.length)], "Oh I've got a hand like a foot!"]);
            }
            said = said.filter(([seat]) => seat !== view.seat);
            if (said.length === 0) return;

            setLines(old => ({...old, ...Object.fromEntries(said)}));
            for (let [seat] of said) {
                clearTimeout(timers[seat]);
                timers[seat] = setTimeout(() => setLines(old => ({...old, [seat] : null})), SPEECH_MS);
            }
        });
        return () => {
            stop();
            Object.values(timers).forEach(clearTimeout);
        };
    }, [client]);
    return lines;
}

// How long until play starts (ms), while everyone looks over their hand:
// what each view says, counted down a second at a time between views, and
// standing still while the game is held. It's kept here, not in the prompt,
// so a prompt mounted afresh (the layout changing) doesn't start it again.
function useLookTime(look: LookView | null, held: boolean): number {
    let [left, setLeft] = useState({look, ms : look?.startsIn ?? 0});
    // a new view says afresh
    if (left.look !== look) setLeft({look, ms : look?.startsIn ?? 0});
    let ms = (left.look === look) ? left.ms : (look?.startsIn ?? 0);
    useEffect(() => {
        if (!look || held || ms <= 0) return;
        let start = performance.now();
        // tick as the seconds shown change
        let timer = setTimeout(() => setLeft({look, ms : Math.max(0, ms - (performance.now() - start))}), ms % 1000 || 1000);
        return () => clearTimeout(timer);
    }, [look, held, ms]);
    return ms;
}

// Your finished games, once this one has ended and been added to them.
function useRecord(ended: boolean, games: () => Promise<GameRecord[]>): GameRecord[] | null {
    let [records, setRecords] = useState<GameRecord[] | null>(null);
    useEffect(() => {
        if (!ended) return;
        let live = true;
        void games().then(list => {
            if (live) setRecords(list);
        });
        return () => {
            live = false;
        };
    }, [ended, games]);
    return ended ? records : null;
}

// Why the host refused your last move, for a few seconds after it did.
function useNotice(refusal: Refusal | null): string | null {
    let [expired, setExpired] = useState(0);
    useEffect(() => {
        if (!refusal) return;
        let timer = setTimeout(() => setExpired(refusal.seq), NOTICE_MS);
        return () => clearTimeout(timer);
    }, [refusal]);
    return (refusal && refusal.seq !== expired) ? refusal.error : null;
}

/** Stops and restarts the whole game (for now, a game in this page against bots). */
export interface Pausing {
    pause(): void;
    resume(): void;
}

interface GameScreenProps {
    client: GameClient;
    /** each seat's bot level, by seat (null for a person) */
    levels: (BotLevel | null)[];
    pausing: Pausing;
    hints: Hints;
    onHintsChange: (hints: Hints) => void;
    /** your finished games, for your record when this one ends */
    games: () => Promise<GameRecord[]>;
    onNewGame: () => void;
    onShowStats: () => void;
}

// A game in progress, as your seat sees it through the client. Everything
// here besides the view is yours alone: how your hand is sorted, the card
// you've selected, and the open dialogs. Moves go to the host as commands.
//
// Nothing in the game moves while you've paused it, or while you're reading
// the scores, the rules or the settings. Leaving the page (for another tab,
// or another app on a phone) pauses it, so you come back to the Paused dialog.
function GameScreen({client, levels, pausing, hints, onHintsChange, games, onNewGame, onShowStats}: GameScreenProps) {
    let {view, refusal, send} = useGame(client);
    // The hand stays sorted the way you last chose until you arrange it
    // yourself. Your own order lasts until the next deal, which comes sorted.
    let [sorted, setSorted] = useState<Exclude<HandSort, "own">>("value");
    let [own, setOwn] = useState<{round: number; order: string[]} | null>(null);
    let [selectedId, setSelectedId] = useState<string | null>(null);
    // a card being dragged counts as the selected one, so the table shows where it can go
    let [draggingId, setDraggingId] = useState<string | null>(null);
    let [goingDown, setGoingDown] = useState(false);
    // the run a card could go at either end of, while it asks which
    let [choosing, setChoosing] = useState<{seat: number; index: number; card: string} | null>(null);
    let [paused, setPaused] = useState(false);
    let [dialog, setDialog] = useState<TableDialog | null>(null);
    let speech = useSpeech(client);
    let notice = useNotice(refusal);
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

    if (!view) return <div className="h-dvh bg-felt" />;

    let me = view.seats[view.seat];
    let sort: HandSort = (own && own.round === view.round) ? "own" : sorted;
    let hand = orderHand(view.hand, sort, own?.order ?? []);
    let selectedIndex = hand.findIndex(card => card.id === (draggingId ?? selectedId));
    let turn = yourTurn(view, hand, (selectedIndex === -1) ? null : selectedIndex, hints);
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
        reorder : (from, to) => setOwn({round : view.round, order : moveCard(hand, from, to)}),
        sortHand : (next) => {
            if (next === "own") {
                // keep the cards where they are, and stop sorting them
                setOwn({round : view.round, order : hand.map(card => card.id)});
            } else {
                setSorted(next);
                setOwn(null);
            }
        },
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

    return (
        <>
            <GameTable
                view={view}
                hand={hand}
                sort={sort}
                levels={levels}
                paused={held}
                dialog={dialog}
                turn={turn}
                lookLeft={lookLeft}
                endChoice={endChoice}
                newCard={newCardTag(view)}
                speech={speech}
                notice={notice}
                actions={actions}
            />
            <GoDownDialog
                open={goingDown && turn.playing && !me.isDown}
                hand={hand}
                requirement={view.requirement}
                onCancel={() => setGoingDown(false)}
                onSubmit={goDown}
            />
            <RoundEndDialog view={view} record={record} onReady={() => send({type : "ready"})} onNewGame={onNewGame} onShowStats={onShowStats} />
            <PauseDialog open={paused} onResume={() => setPaused(false)} />
            <SettingsDialog
                open={dialog === "settings"}
                onOpenChange={(open) => setDialog(open ? "settings" : null)}
                hints={hints}
                onHintsChange={onHintsChange}
                inGame
            />
        </>
    );
}

export default GameScreen;
