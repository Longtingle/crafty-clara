// The game screen's hooks: what it keeps besides the view, and what it does
// as views come in.

import {useEffect, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {GameView, LookView} from '@/engine/view.ts';
import type {Refusal, Talk} from '@/client/game-client.ts';
import type {GameRecord} from '@/storage/history.ts';
import {playSound} from '@/lib/audio.ts';
import {lostClaim} from './log-text.ts';
import {soundsFor, VOLUME} from './sounds.ts';
import {moveCard, orderHand, type HandSort} from './hand-order.ts';
import type {Bubble, Speech} from './speech.ts';

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
 * else. Lines said before the screen opened don't show. It's a store, not
 * state, so a bubble coming and going re-renders only the bubble (Speech).
 */
export function useSpeech(talk: Talk[]): Speech {
    let [speech] = useState(() => {
        let bubbles: Record<number, Bubble | null> = {};
        let listeners = new Set<() => void>();
        return {
            at : (seat: number): Bubble | null => bubbles[seat] ?? null,
            subscribe(listener: () => void) {
                listeners.add(listener);
                return () => { listeners.delete(listener); };
            },
            set(seat: number, bubble: Bubble | null) {
                bubbles = {...bubbles, [seat] : bubble};
                for (let listener of listeners) listener();
            }
        };
    });
    let shown = useRef(talk.at(-1)?.seq ?? 0);
    let timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    useEffect(() => {
        for (let said of talk.filter(said => said.seq > shown.current)) {
            shown.current = said.seq;
            let bubble = {key : said.seq, text : said.text};
            speech.set(said.seat, bubble);
            clearTimeout(timers.current[said.seat]);
            timers.current[said.seat] = setTimeout(() => {
                if (speech.at(said.seat) === bubble) speech.set(said.seat, null);
            }, bubbleMs(said.text));
        }
    }, [talk, speech]);
    useEffect(() => {
        let pending = timers.current;
        return () => Object.values(pending).forEach(clearTimeout);
    }, []);
    return speech;
}

/** How long until play starts, while everyone looks over their hand. */
export interface LookClock {
    /** ms left */
    left(): number;
    /** whether it's standing still, while the game is held */
    held(): boolean;
    /** Calls the listener whenever the clock is set afresh. Returns a function that stops it. */
    subscribe(listener: () => void): () => void;
    /** counts up each time the clock is set afresh */
    version(): number;
}

/**
 * The time left to look over your hand: what each view says, counted down
 * between views, and standing still while the game is held. The screen keeps
 * it, so a prompt mounted afresh (the layout changing) carries on from the
 * same time; the prompt reads it as it ticks (useLookLeft), so the countdown
 * re-renders only the prompt.
 */
export function useLookClock(look: LookView | null, held: boolean): LookClock {
    let [clock] = useState(() => {
        let state = {ms : 0, since : 0, held : false, version : 0};
        let listeners = new Set<() => void>();
        let left = (): number => state.held ? state.ms : Math.max(0, state.ms - (performance.now() - state.since));
        return {
            left,
            held : () => state.held,
            subscribe(listener: () => void) {
                listeners.add(listener);
                return () => { listeners.delete(listener); };
            },
            version : () => state.version,
            set(ms: number, isHeld: boolean) {
                Object.assign(state, {ms, since : performance.now(), held : isHeld, version : state.version + 1});
                for (let listener of listeners) listener();
            }
        };
    });
    // a new view says afresh
    useLayoutEffect(() => {
        clock.set(look?.startsIn ?? 0, clock.held());
    }, [look, clock]);
    // holding stops the clock where it is; letting go starts it from there
    useLayoutEffect(() => {
        if (held !== clock.held()) clock.set(clock.left(), held);
    }, [held, clock]);
    return clock;
}

/** The time left on a look clock (ms), re-rendering as the seconds shown change. */
export function useLookLeft(clock: LookClock): number {
    // set afresh, before the screen is painted
    useSyncExternalStore(clock.subscribe, clock.version);
    let [, tick] = useState(0);
    let left = clock.left();
    useEffect(() => {
        if (clock.held() || left <= 0) return;
        let timer = setTimeout(() => tick(count => count + 1), left % 1000 || 1000);
        return () => clearTimeout(timer);
    });
    return left;
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
