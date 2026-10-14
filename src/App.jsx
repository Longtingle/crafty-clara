import {useEffect, useState} from 'react';
import {MotionConfig} from 'motion/react';
import {startLocalGame} from './host/local-game.ts';
import {createGameClient} from './client/game-client.ts';
import Home from './components/game/home.jsx';
import GameScreen from './components/game/game-screen.jsx';

// The home screen, or a game against the bots. Each game has its own host
// running in this page (src/host), and the screen sees the game only through
// your seat's client, the way it would see a game online.
function App() {
    let [session, setSession] = useState(null);

    // a game's host and bots run until it's stopped
    useEffect(() => () => session?.game.stop(), [session]);

    let startGame = () => {
        let game = startLocalGame({name : "You"});
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
