import {useEffect, useState} from 'react';
import {SET, RUN, type Card} from '@/engine/cards.ts';
import {sortHand} from '@/engine/setruns.ts';
import type {GameClient, Refusal} from '@/client/game-client.ts';
import {useGame} from '@/client/use-game.ts';
import GameTable, {type TableActions} from './game-table.tsx';
import GoDownDialog, {type GoDownSlot} from './go-down-dialog.tsx';
import RoundEndDialog from './round-end-dialog.tsx';
import {opponentSeats} from './players.ts';
import {newCardTag, speechFor} from './log-text.ts';
import {yourTurn} from './your-turn.ts';

// How long an opponent's line of speech, and a refused move's notice, stay up (ms).
const SPEECH_MS = 2000;
const NOTICE_MS = 3000;

// Your cards in the order you've put them: cards you've arranged keep their
// places, and any others join on the right in the order you got them.
const arrange = (hand: Card[], order: string[]): Card[] => {
    let byId = new Map(hand.map(card => [card.id, card]));
    let placed = order.filter(id => byId.has(id));
    let isPlaced = new Set(placed);
    return [...placed.map(id => byId.get(id)!), ...hand.filter(card => !isPlaced.has(card.id))];
}

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
// here besides the view is yours alone: the order of your hand, the card
// you've selected, and the open dialogs. Moves go to the host as commands.
function GameScreen({client, onNewGame}: {client: GameClient; onNewGame: () => void}) {
    let {view, refusal, send} = useGame(client);
    let [order, setOrder] = useState<string[]>([]);
    let [selectedId, setSelectedId] = useState<string | null>(null);
    let [goingDown, setGoingDown] = useState(false);
    let speech = useSpeech(client);
    let notice = useNotice(refusal);

    if (!view) return <div className="h-dvh bg-felt" />;

    let me = view.seats[view.seat];
    let hand = arrange(view.hand, order);
    let selectedIndex = hand.findIndex(card => card.id === selectedId);
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
        reorder : (from, to) => {
            let ids = hand.map(card => card.id);
            ids.splice(to, 0, ids.splice(from, 1)[0]);
            setOrder(ids);
        },
        sortBySuit : () => setOrder(sortHand(hand, RUN).map(card => card.id)),
        sortByValue : () => setOrder(sortHand(hand, SET).map(card => card.id)),
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
        </>
    );
}

export default GameScreen;
