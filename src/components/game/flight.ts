// How cards fly, by game speed: slower when you've slowed the game, so you
// can follow what the others pick up. GameScreen provides the game's speed
// (FlightContext); anywhere else, cards fly at the quickest.

import {createContext, useContext} from 'react';
import type {Transition} from 'motion/react';
import type {GameSpeed} from '@/host/game-speed.ts';

export interface Flight {
    /** a card flying between two places on the table: a spring with a little overshoot */
    transition: Transition & {duration: number};
    /** how long a card that flies into an opponent's hand stays in sight (s) */
    linger: number;
}

// A spring does most of its travelling in its first moments, so the slower
// speeds ease in instead: the card lingers, big enough to read, by where it
// came from, then glides to where it's going.
const GLIDE = [0.5, 0, 0.2, 1] as const;

export const FLIGHTS: Record<GameSpeed, Flight> = {
    relaxed : {transition : {type : "tween", duration : 1.25, ease : GLIDE}, linger : 1.45},
    normal : {transition : {type : "tween", duration : 0.85, ease : GLIDE}, linger : 1},
    quick : {transition : {type : "spring", duration : 0.5, bounce : 0.18}, linger : 0.45}
};

export const FlightContext = createContext<Flight>(FLIGHTS.quick);

export const useFlight = (): Flight => useContext(FlightContext);
