import {ChevronLeft} from 'lucide-react';
import {Button} from '@/components/ui/button.tsx';
import type {BotLevel} from '@/engine/bot.ts';
import {aiColor} from './players.ts';

const LEVELS: {level: BotLevel; label: string}[] = [
    {level : "normal", label : "Normal"},
    {level : "hard", label : "Hard"}
];

// Where an opponent sits matters: the player after you sees your discards
// first, and the player before you comes ahead of you for every claim.
const seatNote = (index: number, count: number): string => {
    if (index === 0) return "Plays straight after you, so gets your discards first";
    if (index === count - 1) return "Plays just before you, so beats you to claims";
    return (count === 3) ? "Plays opposite you" : "Plays after Opponent " + index;
};

interface NewGameProps {
    /** each opponent's level, in turn order after you */
    levels: BotLevel[];
    onLevelsChange: (levels: BotLevel[]) => void;
    onDeal: () => void;
    onBack: () => void;
}

// Before a game: how crafty each opponent is.
function NewGame({levels, onLevelsChange, onDeal, onBack}: NewGameProps) {
    let setLevel = (index: number, level: BotLevel) => onLevelsChange(levels.map((old, i) => (i === index) ? level : old));
    return (
        <main className="relative grid min-h-dvh place-items-center bg-felt p-6 shadow-[inset_0_0_180px_rgb(0_0_0/0.4)] short:px-6 short:py-4">
            <div className="flex w-full max-w-176 flex-col items-center gap-7 short:max-w-none short:items-stretch short:gap-3">
                <header className="flex flex-col items-center gap-2.5 text-center short:flex-row short:gap-2 short:text-left">
                    <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 pl-3 max-sm:static max-sm:self-start short:static short:size-11 short:px-0">
                        <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2.5} />
                        <span className="short:sr-only">Back</span>
                    </Button>
                    <h1 className="font-heading text-[56px] leading-none font-extrabold tracking-tight short:text-[32px]">New game</h1>
                    <p className="text-lg text-muted-foreground short:ml-2 short:text-[15px]">Choose how crafty each opponent is.</p>
                </header>

                <ul aria-label="Opponents" className="w-full rounded-2xl border border-border bg-panel py-1.5 short:py-1">
                    {levels.map((level, index) => (
                        <li key={index} className="flex flex-wrap items-center gap-4 border-white/8 px-5 py-3.5 not-first:border-t short:flex-nowrap short:gap-3 short:py-1.5 short:pr-3 short:pl-3.5">
                            <span
                                aria-hidden="true"
                                className="grid size-11 flex-none place-items-center rounded-full text-lg font-bold text-white short:size-9 short:text-base"
                                style={{backgroundColor : aiColor(index)}}
                            >
                                {index + 1}
                            </span>
                            <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5 short:gap-0">
                                <span id={"opponent-" + index} className="text-lg font-bold short:text-base">Opponent {index + 1}</span>
                                <span className="text-sm text-muted-foreground short:truncate short:text-[13px]">{seatNote(index, levels.length)}</span>
                            </div>
                            <div role="group" aria-labelledby={"opponent-" + index} className="ml-auto grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">
                                {LEVELS.map(option => (
                                    <Button
                                        key={option.level}
                                        variant="ghost"
                                        aria-pressed={level === option.level}
                                        onClick={() => setLevel(index, option.level)}
                                        className="w-26 aria-pressed:bg-cream aria-pressed:text-[#12402a] aria-pressed:hover:bg-cream aria-pressed:hover:text-[#12402a] short:w-22 short:text-[15px]"
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>

                <dl className="-mt-2 grid w-full grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-[15px] text-muted-foreground short:hidden">
                    <dt className="font-bold text-foreground">Normal</dt>
                    <dd>Plays its own hand well.</dd>
                    <dt className="font-bold text-foreground">Hard</dt>
                    <dd>Counts every point, and keeps an eye on what everyone picks up.</dd>
                </dl>

                <div className="flex items-center gap-4 short:mt-auto">
                    <p className="hidden flex-1 text-[13px] leading-snug text-muted-foreground short:block">
                        <b className="text-foreground">Normal</b> plays its own hand well. <b className="text-foreground">Hard</b> counts
                        every point, and keeps an eye on what everyone picks up.
                    </p>
                    <Button size="lg" onClick={onDeal} className="px-9 text-lg short:flex-none short:px-7">Deal the cards</Button>
                </div>
            </div>
        </main>
    );
}

export default NewGame;
