import {useState} from 'react';
import {ChevronLeft, RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/button.tsx';
import type {BotLevel} from '@/engine/bot.ts';
import {character, type CharacterId} from '@/engine/cast.ts';
import {aiColor} from './players.ts';
import {Avatar} from './avatar.tsx';
import CastPicker from './cast-picker.tsx';

const LEVELS: {level: BotLevel; label: string}[] = [
    {level : "normal", label : "Normal"},
    {level : "hard", label : "Hard"}
];

// Where an opponent sits matters: the player after you sees your discards
// first, and the player before you comes ahead of you for every claim.
const seatNote = (index: number, names: string[]): string => {
    if (index === 0) return "Plays straight after you, so gets your discards first";
    if (index === names.length - 1) return "Plays just before you, so beats you to claims";
    return (names.length === 3) ? "Plays opposite you" : "Plays after " + names[index - 1];
};

// The picker's question for a seat.
const seatQuestion = (index: number, names: string[]): string => {
    if (index === 0) return "Who plays straight after you?";
    if (index === names.length - 1) return "Who plays just before you?";
    return (names.length === 3) ? "Who plays opposite you?" : "Who plays after " + names[index - 1] + "?";
};

interface NewGameProps {
    /** who sits in each opponent's seat, in turn order after you */
    cast: CharacterId[];
    onCastChange: (cast: CharacterId[]) => void;
    /** each opponent's level, in the same order */
    levels: BotLevel[];
    onLevelsChange: (levels: BotLevel[]) => void;
    onDeal: () => void;
    onBack: () => void;
}

// Before a game: who you're playing, and how crafty each one is. Change opens
// the whole cast, to pick someone else for that seat. On a phone held
// sideways (a short screen) it's tightened to fit on one screen, with the key
// to the levels beside the Deal button.
function NewGame({cast, onCastChange, levels, onLevelsChange, onDeal, onBack}: NewGameProps) {
    // the seat being chosen for, while the picker is open
    let [picking, setPicking] = useState<number | null>(null);
    let names = cast.map(id => character(id).name);
    let setLevel = (index: number, level: BotLevel) => onLevelsChange(levels.map((old, i) => (i === index) ? level : old));
    let pick = (id: CharacterId) => {
        if (picking !== null) onCastChange(cast.map((old, i) => (i === picking) ? id : old));
        setPicking(null);
    };

    return (
        <main className="relative grid min-h-dvh place-items-center bg-felt p-6 shadow-[inset_0_0_180px_rgb(0_0_0/0.4)] short:px-5 short:py-1.5">
            <div className="flex w-full max-w-176 flex-col items-center gap-7 short:max-w-none short:items-stretch short:gap-1">
                <header className="flex flex-col items-center gap-2.5 text-center short:flex-row short:gap-2 short:text-left">
                    <Button variant="ghost" onClick={onBack} className="absolute top-6 left-6 pl-3 max-sm:static max-sm:self-start short:static short:size-11 short:px-0">
                        <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2.5} />
                        <span className="short:sr-only">Back</span>
                    </Button>
                    <h1 className="font-heading text-[56px] leading-none font-extrabold tracking-tight short:text-[28px]">New game</h1>
                    <p className="text-lg text-muted-foreground short:ml-1 short:min-w-0 short:truncate short:text-[15px]">Choose who you're playing, and how crafty each one is.</p>
                </header>

                <ul aria-label="Opponents" className="w-full rounded-2xl border border-border bg-panel py-1.5 short:py-0.5">
                    {cast.map((id, index) => {
                        let {name, manner} = character(id);
                        return (
                            <li key={index} className="flex flex-wrap items-center gap-4 border-white/8 px-5 py-3.5 not-first:border-t short:flex-nowrap short:gap-3 short:py-0.5 short:pr-1.5 short:pl-3">
                                <Avatar color={aiColor(index)} label={index + 1} character={id} className="size-18 p-1 short:size-9 short:p-0.5" />
                                <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5 short:gap-0">
                                    <div className="flex min-w-0 items-center gap-2.5 short:gap-2">
                                        <span id={"opponent-" + index} className="text-lg font-bold short:text-base">{name}</span>
                                        {/* on a phone, just the icon, as tall as the row */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            aria-label={"Change " + name}
                                            onClick={() => setPicking(index)}
                                            className="h-8 flex-none rounded-full px-3 text-[13px] short:-my-2 short:size-11 short:border-0 short:px-0"
                                        >
                                            <RefreshCw aria-hidden="true" className="size-3.5 short:size-4.5" /><span className="short:hidden">Change</span>
                                        </Button>
                                        <span className="hidden min-w-0 truncate text-[13px] text-cream italic short:block">“{manner}”</span>
                                    </div>
                                    <span className="text-[15px] text-cream italic short:hidden">“{manner}”</span>
                                    <span className="text-sm text-muted-foreground short:truncate short:text-[13px]">{seatNote(index, names)}</span>
                                </div>
                                <div role="group" aria-labelledby={"opponent-" + index} className="ml-auto grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1 short:ml-0 short:p-0.5">
                                    {LEVELS.map(option => (
                                        <Button
                                            key={option.level}
                                            variant="ghost"
                                            aria-pressed={levels[index] === option.level}
                                            onClick={() => setLevel(index, option.level)}
                                            className="w-26 aria-pressed:bg-cream aria-pressed:text-[#12402a] aria-pressed:hover:bg-cream aria-pressed:hover:text-[#12402a] short:w-22 short:text-[15px]"
                                        >
                                            {option.label}
                                        </Button>
                                    ))}
                                </div>
                            </li>
                        );
                    })}
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
                    <Button size="lg" onClick={onDeal} className="px-9 text-lg short:h-11 short:flex-none short:px-7">Deal the cards</Button>
                </div>
            </div>

            {picking !== null && (
                <CastPicker
                    open
                    title={seatQuestion(picking, names)}
                    current={cast[picking]}
                    taken={cast.filter((_, i) => i !== picking)}
                    onPick={pick}
                    onClose={() => setPicking(null)}
                />
            )}
        </main>
    );
}

export default NewGame;
