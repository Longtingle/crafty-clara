import {useEffect, useState} from 'react';
import type {BotLevel} from '@/engine/bot.ts';
import type {GameClient, Refusal} from '@/client/game-client.ts';
import {useGame} from '@/client/use-game.ts';
import GameTable, {type TableActions} from './game-table.tsx';
import GoDownDialog, {type GoDownSlot} from './go-down-dialog.tsx';
import RoundEndDialog from './round-end-dialog.tsx';
import PauseDialog from './pause-dialog.tsx';
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

// A game in progress, as your seat sees it through the client. Everything
// here besides the view is yours alone: how your hand is sorted, the card
// you've selected, and the open dialogs. Moves go to the host as commands.
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
    onNewGame: () => void;
}

function GameScreen({client, levels, pausing, onNewGame}: GameScreenProps) {
    let {view, refusal, send} = useGame(client);
    // The hand stays sorted the way you last chose until you arrange it
    // yourself. Your own order lasts until the next deal, which comes sorted.
    let [sorted, setSorted] = useState<Exclude<HandSort, "own">>("value");
    let [own, setOwn] = useState<{round: number; order: string[]} | null>(null);
    let [selectedId, setSelectedId] = useState<string | null>(null);
    // a card being dragged counts as the selected one, so the table shows where it can go
    let [draggingId, setDraggingId] = useState<string | null>(null);
    let [goingDown, setGoingDown] = useState(false);
    let [paused, setPaused] = useState(false);
    let speech = useSpeech(client);
    let notice = useNotice(refusal);

    if (!view) return <div className="h-dvh bg-felt" />;

    let me = view.seats[view.seat];
    let sort: HandSort = (own && own.round === view.round) ? "own" : sorted;
    let hand = orderHand(view.hand, sort, own?.order ?? []);
    let selectedIndex = hand.findIndex(card => card.id === (draggingId ?? selectedId));
    let turn = yourTurn(view, hand, (selectedIndex === -1) ? null : selectedIndex);
    let selected = turn.selected?.card;

    let actions: TableActions = {
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
            if (!selected) return;
            send({type : "addToSetrun", card : selected.id, target : {seat, index}});
            setSelectedId(null);
        },
        select : (index) => {
            if (turn.playing) setSelectedId(hand[index].id);
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
        pause : () => {
            pausing.pause();
            setPaused(true);
        },
        openGoDown : () => {
            setSelectedId(null);
            setGoingDown(true);
        }
    };

    let goDown = (slots: GoDownSlot[]) => {
        send({type : "goDown", setruns : slots.map(slot => ({type : slot.type, cards : slot.indices.map(index => hand[index].id)}))});
        setGoingDown(false);
    };

    return (
        <>
            <GameTable
                view={view}
                hand={hand}
                sort={sort}
                levels={levels}
                paused={paused}
                turn={turn}
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
            <RoundEndDialog view={view} onReady={() => send({type : "ready"})} onNewGame={onNewGame} />
            <PauseDialog
                open={paused}
                onResume={() => {
                    pausing.resume();
                    setPaused(false);
                }}
            />
        </>
    );
}

export default GameScreen;
