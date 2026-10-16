import {useState, type ReactNode} from 'react';
import {Tabs} from 'radix-ui';
import {ChartColumn, ChevronLeft} from 'lucide-react';
import {cn} from '@/lib/utils.ts';
import {useShortScreen} from '@/lib/use-media-query.ts';
import {Button} from '@/components/ui/button.tsx';
import {ROUND_REQUIREMENTS} from '@/engine/cards.ts';
import {plural, requirementText} from '@/engine/card-names.ts';
import type {GameRecord} from '@/storage/history.ts';
import {gameStats, lineupText, ordinal, percent, playedWhen, type GameResult, type Stats} from './stats.ts';
import {LevelTag} from './avatar.tsx';
import PlaceStrip from './place-strip.tsx';
import {isTagged, LEVEL_NAMES} from './level-names.ts';

const sectionLabel = "section-label text-xs short:text-[11px]";
const box = "rounded-[18px] border border-border bg-panel short:rounded-[14px]";
const bigNumber = "font-heading leading-[1.05] font-extrabold";

// how many games the list of recent games goes back
const RECENT = 50;

const shown = (share: number | null): string => (share === null) ? "–" : share + "%";
const average = (sum: number, count: number): string => (count === 0) ? "–" : Math.round(sum / count) + " pts";

function Tile({label, value, children}: {label: string; value: string; children: ReactNode}) {
    return (
        <div className={cn(box, "flex min-w-0 flex-col gap-1 px-5 py-4 short:gap-0.5 short:px-3.5 short:py-2.5")}>
            <span className={sectionLabel}>{label}</span>
            <span className={cn(bigNumber, "text-[40px] short:text-[30px]")}>{value}</span>
            {children}
        </div>
    );
}

function Panel({title, aside, className, children}: {title: string; aside?: ReactNode; className?: string; children: ReactNode}) {
    return (
        <section className={cn(box, "flex min-w-0 flex-col gap-3 px-5 pt-4 pb-4.5 short:px-3.5 short:pt-2.5 short:pb-3", className)}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h2 className={sectionLabel}>{title}</h2>
                {aside}
            </div>
            {children}
        </section>
    );
}

const note = "text-sm text-muted-foreground short:text-[13px]";

// Games, win rate, the last ten, and your average score.
function Headlines({stats, short}: {stats: Stats; short: boolean}) {
    let recent = stats.results.slice(0, 10).toReversed();
    let recentWins = recent.filter(result => result.won).length;
    let even = Math.round(stats.evenShare * 100) + "%";
    let lastLabel = (recent.length === 1) ? "Last game" : "Last " + recent.length + (short ? "" : " games");
    return (
        <section aria-label="Headlines" className="grid grid-cols-2 gap-4 lg:grid-cols-4 short:grid-cols-4 short:gap-2.5">
            <Tile label="Games" value={String(stats.games)}>
                <span className={note}>{plural(stats.wins, "win")}</span>
            </Tile>
            <Tile label="Win rate" value={shown(percent(stats.wins, stats.games))}>
                <span className={note}>
                    {(stats.players === null)
                        ? "An even share is about " + even
                        : (short ? "An even share is " : "With " + stats.players + " players, an even share is ") + even}
                </span>
            </Tile>
            <Tile label={lastLabel} value={shown(percent(recentWins, recent.length))}>
                <PlaceStrip places={recent.map(result => result.place)} className="short:gap-0.5" cellClassName="short:h-4.5 short:w-[15px] short:rounded short:text-[11px]" />
            </Tile>
            <Tile label="Average score" value={String(Math.round(stats.averageScore))}>
                <span className={note}>{short ? "Best game: " : "Your best game: "}{stats.bestScore}</span>
            </Tile>
        </section>
    );
}

// How often you came 1st, 2nd, 3rd...
function Places({stats}: {stats: Stats}) {
    let most = Math.max(1, ...stats.places);
    return (
        <Panel title="Where you finish" className="short:justify-between short:gap-1">
            {stats.places.map((count, index) => (
                <div key={index} className="grid grid-cols-[40px_1fr_72px] items-center gap-3 short:grid-cols-[34px_1fr_64px] short:gap-2.5">
                    <span className="font-bold short:text-sm">{ordinal(index + 1)}</span>
                    <span className="h-3.5 overflow-hidden rounded-full bg-black/30 short:h-3">
                        <span
                            className={cn("block h-full rounded-full", (index === 0) ? "bg-gold" : "bg-cream")}
                            style={{width : (count / most * 100) + "%"}}
                        />
                    </span>
                    <span className={cn(note, "text-right")}>{plural(count, "game")}</span>
                </div>
            ))}
        </Panel>
    );
}

// How often you finish below each level of bot.
function Levels({stats, short}: {stats: Stats; short: boolean}) {
    return (
        <Panel title="Against each level" className="short:justify-between short:gap-1">
            {stats.levels.map(({level, played, beaten}) => (
                <div key={level} className="flex flex-col gap-1.5 short:gap-1">
                    <div className="flex items-baseline gap-2.5 short:gap-2">
                        {isTagged(level)
                            ? <LevelTag level={level} className="py-0.5 short:px-1.5 short:py-px short:text-[10.5px]" />
                            : <span className="font-bold short:text-sm">{LEVEL_NAMES[level].name}</span>}
                        <span className={note}>
                            {short ? "beaten " : "You beat them "}{plural(beaten, "time")} in {played}
                        </span>
                        <span className={cn(bigNumber, "ml-auto text-[22px] short:text-xl")}>{shown(percent(beaten, played))}</span>
                    </div>
                    <span className="h-2.5 overflow-hidden rounded-full bg-black/30">
                        <span className="block h-full rounded-full bg-cream" style={{width : (beaten / played * 100) + "%"}} />
                    </span>
                </div>
            ))}
            {!short && (
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                    Each game, you beat every opponent who ends on a higher total than you.
                </p>
            )}
        </Panel>
    );
}

// For each round of the game: how often you got down, and your average points.
function RoundChart({stats, className}: {stats: Stats; className?: string}) {
    return (
        <div className={cn("grid flex-1 grid-cols-7 gap-3 short:gap-2", className)}>
            {stats.byRound.map((round, index) => {
                let down = percent(round.down, round.played);
                return (
                    <div key={index} className="flex min-h-0 min-w-0 flex-col items-center gap-1.5 text-center short:gap-0.75">
                        <span className="font-bold short:text-sm">{shown(down)}</span>
                        <span className="relative min-h-20 w-9 flex-1 overflow-hidden rounded-lg bg-black/30 short:min-h-0 short:w-7.5 short:rounded-[7px]">
                            <span className="absolute inset-x-0 bottom-0 rounded-lg bg-cream short:rounded-[7px]" style={{height : (down ?? 0) + "%"}} />
                        </span>
                        <span className="font-heading text-[15px] font-extrabold short:text-[13px]">Round {index + 1}</span>
                        <span className="min-h-7.5 text-xs leading-tight text-muted-foreground short:min-h-6.75 short:text-[11.5px]">
                            {ROUND_REQUIREMENTS[index] && requirementText(ROUND_REQUIREMENTS[index])}
                        </span>
                        <span className="text-[13px] short:text-xs">{average(round.points, round.played)}</span>
                    </div>
                );
            })}
        </div>
    );
}

// What happened in one of your games, in a few words.
const outcome = (result: GameResult): string => {
    let {rival} = result;
    if (!rival) return "";
    if (!result.won) return rival.name + " won on " + rival.total;
    return (rival.total === result.total) ? "tied with " + rival.name : "next best " + rival.total;
};

function PlaceBadge({place}: {place: number}) {
    return (
        <span className={cn(
            "grid h-8 w-10 flex-none place-items-center rounded-lg text-sm font-bold short:h-7 short:w-9.5 short:rounded-[7px] short:text-[13px]",
            (place === 1) ? "bg-gold text-gold-foreground" : "bg-white/12"
        )}>
            {ordinal(place)}
        </span>
    );
}

// Your games, newest first. Two lines a game on a big screen, one on a phone.
function GameList({stats, short, now}: {stats: Stats; short: boolean; now: number}) {
    return (
        <ol className="flex flex-col">
            {stats.results.slice(0, RECENT).map((result, index) => (
                <li
                    key={index}
                    className="flex items-center gap-3 border-white/8 py-1.75 not-first:border-t short:h-11.5 short:py-0"
                >
                    <PlaceBadge place={result.place} />
                    {short
                        ? (
                            <>
                                <span className="w-37.5 flex-none text-sm font-bold">{playedWhen(result.finishedAt, now)}</span>
                                <span className={cn(note, "min-w-0 flex-1 truncate")}>{lineupText(result.lineup)}</span>
                                <span className="w-17.5 flex-none text-right text-sm font-bold">{result.total} pts</span>
                                <span className={cn(note, "w-42.5 flex-none truncate text-right")}>{outcome(result)}</span>
                            </>
                        )
                        : (
                            <>
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="font-bold">{playedWhen(result.finishedAt, now)}</span>
                                    <span className={cn(note, "truncate")}>{lineupText(result.lineup)}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="font-bold">{result.total} pts</span>
                                    <span className={cn(note, "whitespace-nowrap")}>{outcome(result)}</span>
                                </div>
                            </>
                        )}
                </li>
            ))}
        </ol>
    );
}

// Before any games are finished.
function Empty({onStartGame}: {onStartGame: () => void}) {
    return (
        <section className="flex flex-1 flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed border-white/18 p-6 text-center">
            <ChartColumn aria-hidden="true" className="size-10 text-muted-foreground" strokeWidth={1.75} />
            <div className="flex max-w-115 flex-col gap-1.5">
                <h2 className="font-heading text-2xl font-extrabold">No finished games yet</h2>
                <p className="text-[15px] leading-snug text-muted-foreground">
                    Play a game to the end of round {ROUND_REQUIREMENTS.length} and your stats start here: how often you win, where you
                    finish, and how often you get down.
                </p>
            </div>
            <Button size="lg" onClick={onStartGame} className="px-8 text-[17px]">Start game</Button>
        </section>
    );
}

// On a big screen everything fits on one page.
function StatsPage({stats, now}: {stats: Stats; now: number}) {
    let {rounds} = stats;
    return (
        <>
            <Headlines stats={stats} short={false} />
            <div className="grid gap-4 lg:grid-cols-3">
                <Places stats={stats} />
                <Levels stats={stats} short={false} />
                <Panel title="Getting down" className="gap-2.5">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col">
                            <span className={cn(bigNumber, "text-4xl")}>{shown(percent(rounds.down, rounds.played))}</span>
                            <span className={note}>of rounds you got down</span>
                        </div>
                        <div className="flex flex-col">
                            <span className={cn(bigNumber, "text-4xl")}>{shown(percent(rounds.out, rounds.played))}</span>
                            <span className={note}>of rounds you went out</span>
                        </div>
                    </div>
                    <div className="mt-auto flex gap-2">
                        <span className="flex-1 rounded-[10px] bg-white/6 px-2.5 py-2 text-sm">
                            <b>{average(rounds.pointsDown, rounds.down)}</b> <span className="text-muted-foreground">a round when you got down</span>
                        </span>
                        <span className="flex-1 rounded-[10px] bg-white/6 px-2.5 py-2 text-sm">
                            <b>{average(rounds.pointsCaught, rounds.played - rounds.down)}</b> <span className="text-muted-foreground">a round when you didn’t</span>
                        </span>
                    </div>
                </Panel>
            </div>
            {/* on a big screen as tall as the window leaves, with the games scrolling */}
            <div className="grid gap-4 lg:min-h-64 lg:flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
                <Panel
                    title="Round by round"
                    aside={<span className="text-[13px] text-muted-foreground">How often you got down, and your average points</span>}
                    className="gap-2.5"
                >
                    <RoundChart stats={stats} />
                </Panel>
                <Panel title="Recent games" className="max-h-112 min-h-0 gap-1.5 pb-3 lg:max-h-none">
                    <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                        <GameList stats={stats} short={false} now={now} />
                    </div>
                </Panel>
            </div>
        </>
    );
}

const TABS = [{value : "overview", label : "Overview"}, {value : "rounds", label : "Rounds"}, {value : "games", label : "Games"}];

// On a phone held sideways, the stats are in three tabs, each fitting the screen.
function StatsTabs({stats, now}: {stats: Stats; now: number}) {
    let {rounds} = stats;
    let tile = cn(box, "flex items-baseline gap-2 px-3.5 py-2.5");
    return (
        <>
            {/* each fills the screen, scrolling only on the smallest phones */}
            <Tabs.Content value="overview" className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
                <Headlines stats={stats} short />
                <div className="grid flex-1 grid-cols-2 gap-2.5">
                    <Places stats={stats} />
                    <Levels stats={stats} short />
                </div>
            </Tabs.Content>
            <Tabs.Content value="rounds" className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2.5">
                    <div className={tile}>
                        <span className={cn(bigNumber, "text-[28px] leading-none")}>{shown(percent(rounds.down, rounds.played))}</span>
                        <span className={note}>of rounds you got down</span>
                    </div>
                    <div className={tile}>
                        <span className={cn(bigNumber, "text-[28px] leading-none")}>{shown(percent(rounds.out, rounds.played))}</span>
                        <span className={note}>of rounds you went out</span>
                    </div>
                    <div className={cn(box, "flex flex-col justify-center px-3.5 py-1.5 text-[13px] leading-snug")}>
                        <span><b>{average(rounds.pointsDown, rounds.down)}</b> <span className="text-muted-foreground">a round when you got down</span></span>
                        <span><b>{average(rounds.pointsCaught, rounds.played - rounds.down)}</b> <span className="text-muted-foreground">a round when you didn’t</span></span>
                    </div>
                </div>
                <div className={cn(box, "flex min-h-44 flex-1 px-3.5 py-2.5")}>
                    <RoundChart stats={stats} />
                </div>
            </Tabs.Content>
            <Tabs.Content value="games" className={cn(box, "min-h-0 flex-1 overflow-y-auto px-3.5 py-0.5")}>
                <GameList stats={stats} short now={now} />
            </Tabs.Content>
        </>
    );
}

interface StatsScreenProps {
    /** your finished games, oldest first, once they're loaded */
    records: GameRecord[] | null;
    onBack: () => void;
    onStartGame: () => void;
}

// Your stats, from the games you've finished on this device.
function StatsScreen({records, onBack, onStartGame}: StatsScreenProps) {
    let short = useShortScreen();
    let [tab, setTab] = useState("overview");
    // games are dated from when the screen opened
    let [now] = useState(() => Date.now());
    let stats = records && gameStats(records);
    let empty = stats?.games === 0;

    let header = (
        <header className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 short:h-13.5 short:min-h-0 short:flex-none short:flex-nowrap short:gap-1.5">
            <Button variant="ghost" onClick={onBack} className="-ml-2.5 pl-2.5 short:size-11 short:px-0">
                <ChevronLeft aria-hidden="true" className="size-5 short:size-5.5" strokeWidth={2.5} />
                <span className="short:sr-only">Back</span>
            </Button>
            <h1 className="font-heading text-[44px] leading-none font-extrabold tracking-tight short:text-[26px]">Your stats</h1>
            {stats && !empty && (
                <p className="mt-1.5 text-muted-foreground short:mt-0.75 short:ml-1.5 short:text-sm">
                    {short ? plural(stats.games, "game") : "From the " + plural(stats.games, "game") + " you’ve finished on this device"}
                </p>
            )}
            {short && stats && !empty && (
                <Tabs.List aria-label="Stats" className="ml-auto grid flex-none grid-cols-3 gap-0.75 rounded-xl bg-black/30 p-0.75">
                    {TABS.map(({value, label}) => (
                        <Tabs.Trigger
                            key={value}
                            value={value}
                            className="h-10 cursor-pointer rounded-[9px] px-3.5 font-heading text-sm font-bold outline-none focus-visible:outline-3 focus-visible:outline-ring data-[state=active]:bg-cream data-[state=active]:text-cream-foreground"
                        >
                            {label}
                        </Tabs.Trigger>
                    ))}
                </Tabs.List>
            )}
        </header>
    );

    let body = null;
    if (stats && empty) body = <Empty onStartGame={onStartGame} />;
    else if (stats && short) body = <StatsTabs stats={stats} now={now} />;
    else if (stats) body = <StatsPage stats={stats} now={now} />;

    return (
        <main className={cn(
            "flex min-h-dvh flex-col gap-4 bg-felt px-12 pt-6 pb-7 shadow-[inset_0_0_180px_rgb(0_0_0/0.4)] max-lg:px-6 lg:h-dvh lg:overflow-y-auto",
            "short:h-dvh short:min-h-0 short:gap-1.5 short:overflow-hidden short:px-4 short:pt-0 short:pb-3 short:shadow-[inset_0_0_120px_rgb(0_0_0/0.4)]"
        )}>
            {short
                ? <Tabs.Root value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-1.5">{header}{body}</Tabs.Root>
                : <>{header}{body}</>}
        </main>
    );
}

export default StatsScreen;
