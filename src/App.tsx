import {useEffect, useState} from 'react';
import {MotionConfig} from 'motion/react';
import {startLocalGame, type LocalGame} from './host/local-game.ts';
import type {BotLevel} from './engine/bot.ts';
import {createGameClient, type GameClient} from './client/game-client.ts';
import Home from './components/game/home.tsx';
import NewGame from './components/game/new-game.tsx';
import GameScreen from './components/game/game-screen.tsx';
import {goFullscreen} from './lib/fullscreen.ts';

interface Session {
    game: LocalGame;
    client: GameClient;
    /** each seat's bot level, by seat (null for you) */
    levels: (BotLevel | null)[];
}

// In development, ?seed=123 in the URL deals the same cards every game, to
// reproduce a bug or set up a hand to test.
const devSeed = (): number | undefined => {
    let seed = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("seed") : null;
    return (seed === null || !Number.isInteger(Number(seed))) ? undefined : Number(seed);
};

// The opponents' levels are remembered on this device for the next game.
// Storage can be unavailable (private windows) or hold something stale.
const LEVELS_KEY = "crafty-clara.levels";
const OPPONENTS = 3;

const loadLevels = (): BotLevel[] => {
    try {
        let saved: unknown = JSON.parse(localStorage.getItem(LEVELS_KEY) ?? "null");
        if (Array.isArray(saved) && saved.length === OPPONENTS && saved.every(level => level === "normal" || level === "hard")) {
            return saved;
        }
    } catch {
        // fall through to the default
    }
    return Array.from({length : OPPONENTS}, () => "normal");
};

const saveLevels = (levels: BotLevel[]): void => {
    try {
        localStorage.setItem(LEVELS_KEY, JSON.stringify(levels));
    } catch {
        // not remembered, which is fine
    }
};

// The home screen, the choice of opponents, or a game against the bots. Each
// game has its own host running in this page (src/host), and the screen sees
// the game only through your seat's client, the way it would see a game online.
function App() {
    let [choosing, setChoosing] = useState(false);
    let [levels, setLevels] = useState(loadLevels);
    let [session, setSession] = useState<Session | null>(null);

    // a game's host and bots run until it's stopped
    useEffect(() => () => session?.game.stop(), [session]);

    let changeLevels = (next: BotLevel[]) => {
        setLevels(next);
        saveLevels(next);
    };

    // On a phone or tablet, starting a game goes full screen (if you've left
    // full screen since, dealing goes back to it)
    let startGame = () => {
        void goFullscreen();
        setChoosing(true);
    };

    let deal = () => {
        void goFullscreen();
        let game = startLocalGame({name : "You", seed : devSeed(), levels});
        setSession({game, client : createGameClient(game.port), levels : [null, ...levels]});
    };

    // a finished game goes back to the choice of opponents
    let newGame = () => {
        setSession(null);
        setChoosing(true);
    };

    let screen;
    if (session) {
        screen = <GameScreen client={session.client} levels={session.levels} pausing={session.game} onNewGame={newGame} />;
    } else if (choosing) {
        screen = <NewGame levels={levels} onLevelsChange={changeLevels} onDeal={deal} onBack={() => setChoosing(false)} />;
    } else {
        screen = <Home onStartGame={startGame} />;
    }

    // animations respect the "reduce motion" system setting
    return <MotionConfig reducedMotion="user">{screen}</MotionConfig>;
}

export default App;
