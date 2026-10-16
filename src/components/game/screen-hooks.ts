// The game screen's hooks: what it keeps besides the view, and what it does
// as views come in.

import {useEffect, useEffectEvent, useRef, useState} from 'react';
import type {GameView, LookView} from '@/engine/view.ts';
import type {Refusal, Talk} from '@/client/game-client.ts';
import type {GameRecord} from '@/storage/history.ts';
import {playSound} from '@/lib/audio.ts';
import {lostClaim} from './log-text.ts';
import {soundsFor, VOLUME} from './sounds.ts';
import {moveCard, orderHand, type HandSort} from './hand-order.ts';
import type {Bubble} from './speech-bubble.tsx';

/** How long a refused move's notice stays up (ms). */
export const NOTICE_MS = 3000;

/** Calls `onChange` with each new view, and the one before it (null for the first). */
export function useViewChange(view: GameView | null, onChange: (view: GameView, before: GameView | null) => void): void {
    let before = useRef<GameView | null>(null);
    let changed = useEffectEvent(onChange);
    useEffect(() => {
        if (!view) return;
        let last = before.current;
        before.current = view;
        changed(view, last);
    }, [view]);
}

/**
 * The game's sounds, as things happen: for what's new in each view since the
 * last, a moment apart if several things happened at once.
 */
export function useSounds(view: GameView | null, on: boolean): void {
    useViewChange(view, (view, before) => {
        if (!on) return;
        soundsFor(before, view).filter(sound => VOLUME[sound] !== undefined).forEach((sound, index) => playSound(sound, VOLUME[sound], index * 120));
    });
}

/**
 * When someone ahead of you in line claims a discard you asked for too, a
 * notice says so, for a few seconds.
 */
export function useLostClaim(view: GameView | null): string | null {
    // a fresh object each time, so the same words again show for as long
    let [lost, setLost] = useState<{text: string} | null>(null);
    useViewChange(view, (view, before) => {
        if (!before || before.round !== view.round) return;
        let text = view.log.slice(before.log.length).map(entry => lostClaim(entry, view)).findLast(text => text !== null);
        if (text) setLost({text});
    });
    useEffect(() => {
        if (!lost) return;
        let timer = setTimeout(() => setLost(null), NOTICE_MS + 1500);
        return () => clearTimeout(timer);
    }, [lost]);
    return lost?.text ?? null;
}

/** Why the host refused your last move, for a few seconds after it did. */
export function useNotice(refusal: Refusal | null): string | null {
    let [expired, setExpired] = useState(0);
    useEffect(() => {
        if (!refusal) return;
        let timer = setTimeout(() => setExpired(refusal.seq), NOTICE_MS);
        return () => clearTimeout(timer);
    }, [refusal]);
    return (refusal && refusal.seq !== expired) ? refusal.error : null;
}

// How long a line of table talk stays up (ms): long enough to read.
const bubbleMs = (text: string): number => Math.min(6000, Math.max(2500, 1500 + text.length * 55));

/**
 * What each opponent is saying now, by seat, from the talk you see. Each line
 * stays up long enough to read, or until the same player says something
 * else. Lines said before the screen opened don't show.
 */
export function useBubbles(talk: Talk[]): Record<number, Bubble | null> {
    let [bubbles, setBubbles] = useState<Record<number, Bubble | null>>({});
    let shown = useRef(talk.at(-1)?.seq ?? 0);
    let timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    useEffect(() => {
        let fresh = talk.filter(said => said.seq > shown.current);
        if (fresh.length === 0) return;
        shown.current = fresh.at(-1)!.seq;
        setBubbles(old => ({...old, ...Object.fromEntries(fresh.map(said => [said.seat, {key : said.seq, text : said.text}]))}));
        for (let said of fresh) {
            clearTimeout(timers.current[said.seat]);
            timers.current[said.seat] = setTimeout(() => {
                setBubbles(old => (old[said.seat]?.key === said.seq) ? {...old, [said.seat] : null} : old);
            }, bubbleMs(said.text));
        }
    }, [talk]);
    useEffect(() => {
        let pending = timers.current;
        return () => Object.values(pending).forEach(clearTimeout);
    }, []);
    return bubbles;
}

/**
 * How long until play starts (ms), while everyone looks over their hand:
 * what each view says, counted down a second at a time between views, and
 * standing still while the game is held. It's kept by the screen, not the
 * prompt, so a prompt mounted afresh (the layout changing) doesn't start it
 * again.
 */
export function useLookTime(look: LookView | null, held: boolean): number {
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

/** Your finished games, once this one has ended and been added to them. */
export function useRecord(ended: boolean, games: () => Promise<GameRecord[]>): GameRecord[] | null {
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

/**
 * Your hand as you've laid it out. It stays sorted the way you last chose
 * until you arrange it yourself; your own order lasts until the next deal,
 * which comes sorted.
 */
export function useHandOrder(view: GameView | null) {
    let [sorted, setSorted] = useState<Exclude<HandSort, "own">>("value");
    let [own, setOwn] = useState<{round: number; order: string[]} | null>(null);
    let round = view?.round ?? 0;
    let sort: HandSort = (own && own.round === round) ? "own" : sorted;
    let hand = view ? orderHand(view.hand, sort, own?.order ?? []) : [];
    return {
        hand,
        sort,
        /** moves a card along, into your own order */
        reorder : (from: number, to: number) => setOwn({round, order : moveCard(hand, from, to)}),
        sortHand : (next: HandSort) => {
            if (next === "own") {
                // keep the cards where they are, and stop sorting them
                setOwn({round, order : hand.map(card => card.id)});
            } else {
                setSorted(next);
                setOwn(null);
            }
        }
    };
}
