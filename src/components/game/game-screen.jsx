import {useEffect, useState} from 'react';
import {SET, RUN} from '@/engine/cards.ts';
import {sortHand} from '@/engine/setruns.ts';
import {useGame} from '@/client/use-game.js';
import GameTable from './game-table.jsx';
import GoDownDialog from './go-down-dialog.jsx';
import RoundEndDialog from './round-end-dialog.jsx';
import {opponentSeats} from './players.js';
import {newCardTag} from './log-text.js';

// How long an opponent's line of speech, and a refused move's notice, stay up (ms).
const SPEECH_MS = 2000;
const NOTICE_MS = 3000;

// Your cards in the order you've put them: cards you've arranged keep their
// places, and any others join on the right in the order you got them.
const arrange = (hand, order) => {
    let byId = new Map(hand.map(card => [card.id, card]));
    let placed = order.filter(id => byId.has(id));
    let isPlaced = new Set(placed);
    return [...placed.map(id => byId.get(id)), ...hand.filter(card => !isPlaced.has(card.id))];
}

// What an opponent says after a move: [[seat, line]].
const linesFor = (entry, view) => {
    switch (entry.type) {
        case "draw": return [[entry.seat, (entry.from === "deck") ? "Picked from deck" : "Picked from discard"]];
        case "claim": return [[entry.seat, "I'll take that!"]];
        case "goDown": return [[entry.seat, "Right, I'm putting my cards down now."]];
        case "discard": return [[entry.seat, "Does anyone want this?"], [(entry.seat + 1) % view.seats.length, "...thinking..."]];
        // someone adding to your setruns gets a reaction
        case "add": return (entry.seat === view.seat) ? [[entry.target.seat, "Woah, steady there!"]] : [];
        default: return [];
    }
}

// What each opponent is saying, by seat: a line for a moment after some
// moves, and a grumble from one of them as each round is dealt. It listens to
// the client, so it hears each new log entry as it arrives.
function useSpeech(client) {
    let [lines, setLines] = useState({});

    useEffect(() => {
        let timers = {};
        // the round and how much of its log has been heard
        let heard = {round : null, count : 0};
        let current = client.getSnapshot().view;
        if (current) heard = {round : current.round, count : current.log.length};

        let stop = client.subscribe(() => {
            let view = client.getSnapshot().view;
            if (!view) return;
            let {round, log} = view;
            let newRound = heard.round !== round;
            let fresh = newRound ? log : log.slice(heard.count);
            heard = {round, count : log.length};

            let said = fresh.flatMap(entry => linesFor(entry, view));
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
function useNotice(refusal) {
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
function GameScreen({client, onNewGame}) {
    let {view, refusal, send} = useGame(client);
    let [order, setOrder] = useState([]);
    let [selectedId, setSelectedId] = useState(null);
    let [goingDown, setGoingDown] = useState(false);
    let speech = useSpeech(client);
    let notice = useNotice(refusal);

    if (!view) return <div className="h-dvh bg-felt" />;

    let me = view.seats[view.seat];
    let hand = arrange(view.hand, order);
    let playing = view.turn === view.seat && view.phase === "play";
    let selectedIndex = hand.findIndex(card => card.id === selectedId);
    let selected = (playing && selectedIndex !== -1) ? selectedIndex : null;

    let actions = {
        drawFromDeck : () => send({type : "draw", from : "deck"}),
        takeDiscard : () => send({type : "draw", from : "discard"}),
        claim : () => send({type : "claim"}),
        pass : () => send({type : "pass"}),
        discard : () => {
            if (selected === null) return;
            send({type : "discard", card : hand[selected].id});
            setSelectedId(null);
        },
        addToMeld : (seat, index) => {
            if (selected === null) return;
            send({type : "addToSetrun", card : hand[selected].id, target : {seat, index}});
            setSelectedId(null);
        },
        select : (index) => {
            if (playing) setSelectedId(hand[index].id);
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

    // slots: [{type, indices}] from the go-down dialog, indices into `hand`
    let goDown = (slots) => {
        send({type : "goDown", setruns : slots.map(slot => ({type : slot.type, cards : slot.indices.map(index => hand[index].id)}))});
        setGoingDown(false);
    };

    return (
        <>
            <GameTable
                view={view}
                hand={hand}
                selected={selected}
                newCard={newCardTag(view)}
                speech={speech}
                notice={notice}
                actions={actions}
            />
            <GoDownDialog
                open={goingDown && playing && !me.isDown}
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
