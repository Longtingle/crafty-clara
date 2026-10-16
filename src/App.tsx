import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import {MotionConfig} from 'motion/react';
import type {BotLevel} from './engine/levels.ts';
import {dealCast, type CharacterId} from './engine/cast.ts';
import type {LocalGameSave} from './host/local-game.ts';
import type {Session, SessionOptions} from './session.ts';
import {gameHistory, heardLines, savedGame, settings} from './storage/platform.ts';
import {DEFAULT_PREFERENCES, type Preferences} from './storage/settings.ts';
import {unlockAudio} from './lib/audio.ts';
import {SOUNDS} from './components/game/sounds.ts';
import type {GameRecord} from './storage/history.ts';
import Home from './components/game/home.tsx';
import NewGame from './components/game/new-game.tsx';
import StatsScreen from './components/game/stats-screen.tsx';
import {goFullscreen} from './lib/fullscreen.ts';

// The game itself (its screen, the host and the bots) is a separate download,
// fetched once the home screen is up, so the home screen comes first.
const loadGame = () => Promise.all([import('./session.ts'), import('./components/game/game-screen.tsx')]);
const GameScreen = lazy(() => import('./components/game/game-screen.tsx'));

// In development, ?seed=123 in the URL deals the same cards every game, to
// reproduce a bug or set up a hand to test.
const devSeed = (): number | undefined => {
    let seed = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("seed") : null;
    return (seed === null || !Number.isInteger(Number(seed))) ? undefined : Number(seed);
};

const OPPONENTS = 3;
const ALL_NORMAL: BotLevel[] = Array.from({length : OPPONENTS}, () => "normal");
// who you play the first time, until you choose: kept, so it's the same next time
const firstCast = (): CharacterId[] => {
    let cast = dealCast(OPPONENTS);
    settings.setCast(cast);
    return cast;
};

/** The screens besides a game: home, the choice of opponents, and your stats. */
type Page = "home" | "newGame" | "stats";

// The home screen, the choice of opponents, your stats, or a game against the
// bots. Each game has its own host running in this page (src/host), and the
// screen sees the game only through your seat's client, the way it would see
// a game online. What's kept between visits (the game in progress, the
// opponents you chose last time, your settings, your finished games) is in
// src/storage.
function App() {
    let [page, setPage] = useState<Page>("home");
    let [cast, setCast] = useState<CharacterId[] | null>(null);
    let [levels, setLevels] = useState(ALL_NORMAL);
    let [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
    // what you've changed since the page opened, which the preferences kept
    // from last time, read as it opens, mustn't undo
    let changed = useRef<Partial<Preferences>>({});
    // the table talk heard lately, which the cast keep off
    let [heard, setHeard] = useState<string[]>([]);
    // your finished games, for the stats screen
    let [records, setRecords] = useState<GameRecord[] | null>(null);
    // a game from an earlier visit, to carry on
    let [saved, setSaved] = useState<LocalGameSave | null>(null);
    let [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        // a failure here is tried again when you deal
        loadGame().catch(() => {});
        void settings.cast().then(kept => setCast((kept?.length === OPPONENTS) ? kept : firstCast()));
        void settings.levels().then(kept => {
            if (kept?.length === OPPONENTS) setLevels(kept);
        });
        void settings.preferences().then(kept => setPrefs({...kept, ...changed.current}));
        void heardLines.list().then(setHeard);
        void savedGame.load().then(setSaved);
    }, []);

    // a game's host and bots run until it's stopped
    useEffect(() => () => session?.game.stop(), [session]);

    let changeCast = (next: CharacterId[]) => {
        setCast(next);
        settings.setCast(next);
    };

    let changeLevels = (next: BotLevel[]) => {
        setLevels(next);
        settings.setLevels(next);
    };

    let changePrefs = (changes: Partial<Preferences>) => {
        changed.current = {...changed.current, ...changes};
        setPrefs(old => ({...old, ...changes}));
        settings.setPreferences(changes);
        // the tap that turns sound on lets the game make it
        if (changes.sound) unlockAudio(SOUNDS);
        // a game in progress speeds up or slows down at once
        if (changes.speed) session?.game.setSpeed(changes.speed);
    };

    // On a phone or tablet, starting a game goes full screen (if you've left
    // full screen since, dealing goes back to it)
    let startGame = () => {
        void goFullscreen();
        setPage("newGame");
    };

    let play = (options: Pick<SessionOptions, "cast" | "levels" | "seed" | "from">) => {
        void goFullscreen();
        // the tap that deals lets the game make sound
        unlockAudio(SOUNDS);
        loadGame().then(
            ([{startSession}]) => {
                try {
                    setSession(startSession({...options, speed : prefs.speed, savedGame, history : gameHistory, heardLines, heard}));
                } catch (error) {
                    // a saved game this version can't carry on
                    console.error(error);
                    savedGame.save(null);
                }
                // a new game replaces the saved one
                setSaved(null);
            },
            // Offline, or a new version of the site has replaced the files
            // this page asks for: start again from the home screen.
            () => window.location.reload()
        );
    };

    // a finished game goes back to the choice of opponents, or to your stats
    let newGame = () => {
        setSession(null);
        setPage("newGame");
        void heardLines.list().then(setHeard);
    };
    let showStats = () => {
        setSession(null);
        setRecords(null);
        setPage("stats");
        void gameHistory.list().then(setRecords);
    };

    let screen;
    if (session) {
        screen = (
            <GameScreen
                client={session.client}
                seats={session.seats}
                pausing={session.game}
                prefs={prefs}
                onPrefsChange={changePrefs}
                games={gameHistory.list}
                onNewGame={newGame}
                onShowStats={showStats}
            />
        );
    } else if (page === "newGame") {
        // who you play is kept on the device, and read as the page opens
        screen = cast
            ? (
                <NewGame
                    cast={cast}
                    onCastChange={changeCast}
                    levels={levels}
                    onLevelsChange={changeLevels}
                    onDeal={() => play({cast, levels, seed : devSeed()})}
                    onBack={() => setPage("home")}
                />
            )
            : <div className="h-dvh bg-felt" />;
    } else if (page === "stats") {
        screen = <StatsScreen records={records} onBack={() => setPage("home")} onStartGame={startGame} />;
    } else {
        screen = (
            <Home
                savedRound={saved && saved.state.round}
                onContinue={() => saved && play({from : saved})}
                onStartGame={startGame}
                onShowStats={showStats}
                prefs={prefs}
                onPrefsChange={changePrefs}
            />
        );
    }

    // animations respect the "reduce motion" system setting
    return (
        <MotionConfig reducedMotion="user">
            <Suspense fallback={<div className="h-dvh bg-felt" />}>{screen}</Suspense>
        </MotionConfig>
    );
}

export default App;
