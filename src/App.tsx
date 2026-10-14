import {useEffect, useState} from 'react';
import {MotionConfig} from 'motion/react';
import {startLocalGame, type LocalGame} from './host/local-game.ts';
import type {BotLevel} from './engine/bot.ts';
import {createGameClient, type GameClient} from './client/game-client.ts';
import Home from './components/game/home.tsx';
import GameScreen from './components/game/game-screen.tsx';

interface Session {
    /** counts up with each game, so a new game remounts the screen */
    id: number;
    game: LocalGame;
    client: GameClient;
}

// In development, ?seed=123 in the URL deals the same cards every game, to
// reproduce a bug or set up a hand to test, and ?bots=hard,normal,hard sets
// the opponents' levels.
const devParam = (name: string): string | null =>
    import.meta.env.DEV ? new URLSearchParams(window.location.search).get(name) : null;

const devSeed = (): number | undefined => {
    let seed = devParam("seed");
    return (seed === null || !Number.isInteger(Number(seed))) ? undefined : Number(seed);
};

const devLevels = (): BotLevel[] =>
    (devParam("bots") ?? "").split(",").map((level): BotLevel => (level === "hard") ? "hard" : "normal");

// The home screen, or a game against the bots. Each game has its own host
// running in this page (src/host), and the screen sees the game only through
// your seat's client, the way it would see a game online.
function App() {
    let [session, setSession] = useState<Session | null>(null);

    // a game's host and bots run until it's stopped
    useEffect(() => () => session?.game.stop(), [session]);

    let startGame = () => {
        let game = startLocalGame({name : "You", seed : devSeed(), levels : devLevels()});
        setSession({id : (session?.id ?? 0) + 1, game, client : createGameClient(game.port)});
    };

    // animations respect the "reduce motion" system setting
    return (
        <MotionConfig reducedMotion="user">
            {session
                ? <GameScreen key={session.id} client={session.client} onNewGame={startGame} />
                : <Home onStartGame={startGame} />}
        </MotionConfig>
    );
}

export default App;
