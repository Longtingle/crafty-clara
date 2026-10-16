import {useId, type ReactNode} from 'react';
import {Volume2, VolumeX} from 'lucide-react';
import {cn} from '@/lib/utils.ts';
import {useShortScreen} from '@/lib/use-media-query.ts';
import {Button} from '@/components/ui/button.tsx';
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog.tsx';
import {Switch} from '@/components/ui/switch.tsx';
import {SegmentedControl, type Segment} from '@/components/ui/segmented-control.tsx';
import {createCard} from '@/engine/cards.ts';
import {GAME_SPEEDS, type GameSpeed} from '@/host/game-speed.ts';
import type {Hints, Preferences, TalkLevel} from '@/storage/settings.ts';
import {PlayingCard} from './playing-card.tsx';
import {portraitImage} from './players.ts';

const sectionLabel = "section-label text-xs short:text-[11px]";

// three cards from a hand, the outer two fitting a meld
const FAN = [createCard(8, "D", "8D"), createCard(2, "C", "2C"), createCard(9, "D", "9D")];
// a run on the table, and the card picked to add to it
const RUN = [createCard(5, "D", "5D"), createCard(6, "D", "6D"), createCard(7, "D", "7D")];
const PICKED = createCard(8, "D", "8D");

const picture = "h-19 w-28 short:h-14 short:w-22";

// What the gold dots look like, on or off.
function FitsPicture({on}: {on: boolean}) {
    return (
        <span className={cn(picture, "flex items-start justify-center pt-0.5")}>
            {FAN.map((card, index) => (
                <span key={card.displayString} className="relative -mr-2 block w-10 last:mr-0 short:w-7.5" style={{rotate : (index - 1) * 6 + "deg"}}>
                    <PlayingCard card={card} alt="" className="w-full" />
                    {index !== 1 && (
                        <span className={cn(
                            "absolute -bottom-3.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-gold transition-opacity short:-bottom-3 short:size-2",
                            !on && "opacity-0"
                        )} />
                    )}
                </span>
            ))}
        </span>
    );
}

// A meld lighting up for the card picked, or not.
function TargetsPicture({on}: {on: boolean}) {
    return (
        <span className={cn(picture, "flex items-center justify-center gap-2 short:gap-1.5")}>
            <span className={cn(
                "flex rounded-lg border-2 p-0.5 transition-[border-color,box-shadow]",
                on ? "border-gold shadow-[0_0_0_4px_rgb(245_184_61/0.22)]" : "border-transparent bg-black/18"
            )}>
                {RUN.map((card, index) => (
                    <PlayingCard key={card.displayString} card={card} alt="" className={cn("w-7.5 short:w-6", index > 0 && "-ml-4.5 short:-ml-3.5")} />
                ))}
            </span>
            {/* picked: lifted, with a gold ring */}
            <span className="-translate-y-2 rounded-[3px] shadow-[0_0_0_2px_var(--gold)]">
                <PlayingCard card={PICKED} alt="" className="w-8 short:w-6.5" />
            </span>
        </span>
    );
}

// The Go down button, glowing or not.
function ReadyPicture({on}: {on: boolean}) {
    return (
        <span className={cn(picture, "grid place-items-center")}>
            <span className={cn(
                "inline-flex h-10 items-center rounded-[10px] px-4.5 font-heading text-[15px] font-bold transition-[background-color,box-shadow,color] short:h-8 short:px-3 short:text-[13px]",
                on ? "bg-gold text-gold-foreground shadow-[0_0_0_4px_rgb(245_184_61/0.3),0_0_22px_rgb(245_184_61/0.55)]" : "bg-white/10 text-cream/55"
            )}>
                Go down
            </span>
        </span>
    );
}

interface HintRowProps {
    title: string;
    about: string;
    picture: ReactNode;
    on: boolean;
    onChange: (on: boolean) => void;
}

// A hint with a picture of what it does. Tapping anywhere on it flips the switch.
function HintRow({title, about, picture, on, onChange}: HintRowProps) {
    let id = useId();
    return (
        <div className="flex items-center gap-4.5 px-4.5 py-4 not-first:border-t not-first:border-white/8 short:gap-4 short:px-4 short:py-2">
            <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer items-center gap-4.5 short:gap-4">
                <span aria-hidden="true" className="flex-none">{picture}</span>
                <span className="flex min-w-0 flex-col gap-0.5">
                    <span id={id + "-title"} className="text-[17px] font-bold short:text-base">{title}</span>
                    <span id={id + "-about"} className="text-sm leading-snug text-muted-foreground short:text-[13.5px]">{about}</span>
                </span>
            </label>
            <Switch id={id} checked={on} onCheckedChange={onChange} aria-labelledby={id + "-title"} aria-describedby={id + "-about"} />
        </div>
    );
}

function HintList({hints, onChange}: {hints: Hints; onChange: (hints: Hints) => void}) {
    return (
        <div className="flex flex-col rounded-2xl border border-white/10 bg-panel short:rounded-[14px]">
            <HintRow
                title="Cards that fit a meld"
                about="Once you’re down, a gold dot marks each card you can add to a meld."
                picture={<FitsPicture on={hints.fits} />}
                on={hints.fits}
                onChange={fits => onChange({...hints, fits})}
            />
            <HintRow
                title="Where a card can go"
                about="The melds the card you pick fits light up gold. With this off, you can try a card on any meld."
                picture={<TargetsPicture on={hints.targets} />}
                on={hints.targets}
                onChange={targets => onChange({...hints, targets})}
            />
            <HintRow
                title="When you can go down"
                about="Go down glows gold, and the prompt says so, once your hand has what the round needs."
                picture={<ReadyPicture on={hints.ready} />}
                on={hints.ready}
                onChange={ready => onChange({...hints, ready})}
            />
        </div>
    );
}

interface Choice<T extends string> extends Segment<T> {
    /** what it means, shown under the title while it's chosen */
    about: string;
}

const SPEEDS: Choice<GameSpeed>[] = [
    {value : "relaxed", label : "Relaxed", about : "Time to see who picks up what, and 10 seconds to claim a discard."},
    {value : "normal", label : "Normal", about : "A steady pace, and 8 seconds to claim a discard."},
    {value : "quick", label : "Quick", about : "Brisk, with 6 seconds to claim a discard."}
];

const TALK_LEVELS: Choice<TalkLevel>[] = [
    {value : "off", label : "Off", about : "Nobody says a word."},
    {value : "quiet", label : "Quiet", about : "Just the big moments: going down, going out, winning."},
    {value : "chatty", label : "Chatty", about : "Banter, bluffs and the odd terrible pun."}
];

// The time you have to claim a discard, as the countdown ring shows it.
function SpeedPicture({speed}: {speed: GameSpeed}) {
    let seconds = GAME_SPEEDS[speed].claimWindowMs / 1000;
    return (
        <span className={cn(picture, "grid place-items-center")}>
            <span className="relative grid size-14 place-items-center short:size-11">
                <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="4.5" />
                    <circle
                        cx="24" cy="24" r="20" fill="none" stroke="var(--gold)" strokeWidth="4.5" strokeLinecap="round"
                        pathLength={100} strokeDasharray={seconds * 10 + " 100"} className="transition-[stroke-dasharray] duration-300"
                    />
                </svg>
                <span className="font-heading text-xl font-extrabold short:text-base">{seconds}</span>
            </span>
        </span>
    );
}

// One of them saying something.
function TalkPicture() {
    return (
        <span className={cn(picture, "relative block")}>
            <img src={portraitImage("clara")} alt="" className="absolute bottom-0.5 left-1 size-12 rounded-full border-2 border-[#2f6f99] object-cover short:size-9" />
            <span className="absolute top-1 left-11 rounded-xl bg-cream px-2.5 py-1 text-[13px] font-bold text-cream-foreground shadow-[0_4px_10px_rgb(0_0_0/0.35)] short:top-0 short:left-8 short:px-2 short:text-[11px]">
                Ooh!
                <span className="absolute -bottom-1 left-1.5 size-2.5 rotate-45 rounded-[2px] bg-cream" />
            </span>
        </span>
    );
}

interface ChoiceRowProps<T extends string> {
    title: string;
    picture: ReactNode;
    choices: Choice<T>[];
    value: T;
    onChange: (value: T) => void;
}

// A setting with a few choices, a picture of it, and what the one chosen means.
function ChoiceRow<T extends string>({title, picture, choices, value, onChange}: ChoiceRowProps<T>) {
    let id = useId();
    return (
        <div className="flex items-center gap-4.5 px-4.5 py-4 not-first:border-t not-first:border-white/8 short:gap-4 short:px-4 short:py-2.5">
            <span aria-hidden="true" className="flex-none">{picture}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 short:gap-1.5">
                <span className="flex flex-col gap-0.5">
                    <span id={id} className="text-[17px] font-bold short:text-base">{title}</span>
                    <span className="text-sm leading-snug text-muted-foreground short:text-[13.5px]">{choices.find(choice => choice.value === value)!.about}</span>
                </span>
                <SegmentedControl
                    options={choices}
                    value={value}
                    onChange={onChange}
                    labelledBy={id}
                    className="grid-cols-3 self-start short:p-0.5"
                    optionClassName="px-3.5 short:h-10 short:px-3 short:text-[15px]"
                />
            </div>
        </div>
    );
}

// A speaker, sounding or not.
function SoundPicture({on}: {on: boolean}) {
    let Icon = on ? Volume2 : VolumeX;
    return (
        <span className={cn(picture, "grid place-items-center")}>
            <span className={cn("grid size-14 place-items-center rounded-full transition-colors short:size-11", on ? "bg-gold text-gold-foreground" : "bg-white/10 text-cream/55")}>
                <Icon className="size-7 short:size-5.5" />
            </span>
        </span>
    );
}

interface PrefsProps {
    prefs: Preferences;
    onPrefsChange: (changes: Partial<Preferences>) => void;
}

function GameSettings({prefs, onPrefsChange}: PrefsProps) {
    return (
        <div className="flex flex-col rounded-2xl border border-white/10 bg-panel short:rounded-[14px]">
            <ChoiceRow title="Game speed" picture={<SpeedPicture speed={prefs.speed} />} choices={SPEEDS} value={prefs.speed} onChange={speed => onPrefsChange({speed})} />
            <ChoiceRow title="Table talk" picture={<TalkPicture />} choices={TALK_LEVELS} value={prefs.talk} onChange={talk => onPrefsChange({talk})} />
            <HintRow
                title="Sound effects"
                about="Cards dealt, drawn and played, a claim out of turn, your turn, and the end of each round."
                picture={<SoundPicture on={prefs.sound} />}
                on={prefs.sound}
                onChange={sound => onPrefsChange({sound})}
            />
        </div>
    );
}

interface SettingsDialogProps extends PrefsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** opened from a game, which waits while it's open */
    inGame?: boolean;
}

// Your settings: how quickly the game goes, how much table talk, and the
// hints. A dialog, the game's settings beside the hints on a wide screen, or
// on a phone a sheet that fills the screen. Each change is kept as it's made.
function SettingsDialog({open, onOpenChange, prefs, onPrefsChange, inGame = false}: SettingsDialogProps) {
    let game = <GameSettings prefs={prefs} onPrefsChange={onPrefsChange} />;
    let hints = <HintList hints={prefs.hints} onChange={hints => onPrefsChange({hints})} />;
    let short = useShortScreen();
    let done = (
        <DialogClose asChild>
            <Button size="lg" className="px-8 text-[17px] short:h-11 short:px-6.5 short:text-base">Done</Button>
        </DialogClose>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {short
                ? (
                    <DialogContent
                        showCloseButton={false}
                        sheet
                        className="flex flex-col gap-2.5 overflow-y-auto px-5 pt-0 pb-4"
                    >
                        <header className="flex h-14 flex-none items-center gap-3">
                            <DialogTitle className="text-[26px] leading-none">Settings</DialogTitle>
                            <DialogDescription className="mt-0.5 min-w-0 truncate text-sm">
                                {inGame ? "The game is paused while this is open." : "Kept on this device."}
                            </DialogDescription>
                            <span className="flex-1" />
                            {done}
                        </header>
                        <h3 className={sectionLabel}>Game</h3>
                        {game}
                        <h3 className={cn(sectionLabel, "mt-1.5")}>Hints</h3>
                        {hints}
                    </DialogContent>
                )
                : (
                    <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4.5 overflow-y-auto px-7 py-6 sm:max-w-[640px] lg:max-w-[1060px]">
                        <DialogTitle className="text-3xl">Settings</DialogTitle>
                        <div className="grid gap-x-7 gap-y-4.5 lg:grid-cols-2">
                            <section className="flex flex-col gap-4.5">
                                <div className="flex flex-col gap-1">
                                    <h3 className={sectionLabel}>Game</h3>
                                    <p className="text-[15px] text-muted-foreground">How quickly your opponents play, what they say as they do, and sound.</p>
                                </div>
                                {game}
                            </section>
                            <section className="flex flex-col gap-4.5">
                                <div className="flex flex-col gap-1">
                                    <h3 className={sectionLabel}>Hints</h3>
                                    <p className="text-[15px] text-muted-foreground">Help while you play. Turn them off for a sterner game.</p>
                                </div>
                                {hints}
                            </section>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <DialogDescription className="min-w-48 flex-1 text-[13px] leading-snug">
                                Kept on this device.{" "}
                                {inGame ? "The game is paused while this is open." : "You can change these during a game too."}
                            </DialogDescription>
                            {done}
                        </div>
                    </DialogContent>
                )}
        </Dialog>
    );
}

export default SettingsDialog;
