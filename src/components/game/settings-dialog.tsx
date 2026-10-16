import {useId, type ReactNode} from 'react';
import {cn} from '@/lib/utils.ts';
import {useMediaQuery} from '@/lib/use-media-query.ts';
import {Button} from '@/components/ui/button.tsx';
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog.tsx';
import {Switch} from '@/components/ui/switch.tsx';
import {createCard} from '@/engine/cards.ts';
import type {Hints, TalkLevel} from '@/storage/settings.ts';
import {PlayingCard} from './playing-card.tsx';
import {portraitImage} from './players.ts';

const sectionLabel = "text-xs font-bold tracking-widest text-muted-foreground uppercase short:text-[11px]";

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

function HintList({hints, onHintsChange}: {hints: Hints; onHintsChange: (hints: Hints) => void}) {
    return (
        <div className="flex flex-col rounded-2xl border border-white/10 bg-panel short:rounded-[14px]">
            <HintRow
                title="Cards that fit a meld"
                about="Once you’re down, a gold dot marks each card you can add to a meld."
                picture={<FitsPicture on={hints.fits} />}
                on={hints.fits}
                onChange={fits => onHintsChange({...hints, fits})}
            />
            <HintRow
                title="Where a card can go"
                about="The melds the card you pick fits light up gold. With this off, you can try a card on any meld."
                picture={<TargetsPicture on={hints.targets} />}
                on={hints.targets}
                onChange={targets => onHintsChange({...hints, targets})}
            />
            <HintRow
                title="When you can go down"
                about="Go down glows gold, and the prompt says so, once your hand has what the round needs."
                picture={<ReadyPicture on={hints.ready} />}
                on={hints.ready}
                onChange={ready => onHintsChange({...hints, ready})}
            />
        </div>
    );
}

const TALK_LEVELS: {level: TalkLevel; label: string; about: string}[] = [
    {level : "off", label : "Off", about : "Nobody says a word."},
    {level : "quiet", label : "Quiet", about : "Just the big moments: going down, going out, winning."},
    {level : "chatty", label : "Chatty", about : "Banter, bluffs and the odd terrible pun."}
];

// How much of what your opponents say you see, with a picture of one of
// them saying something.
function TalkChoice({talk, onTalkChange}: {talk: TalkLevel; onTalkChange: (level: TalkLevel) => void}) {
    let id = useId();
    return (
        <div className="flex items-center gap-4.5 rounded-2xl border border-white/10 bg-panel px-4.5 py-4 short:gap-4 short:rounded-[14px] short:px-4 short:py-2">
            <span aria-hidden="true" className={cn(picture, "relative flex-none")}>
                <img src={portraitImage("clara")} alt="" className="absolute bottom-0.5 left-1 size-12 rounded-full border-2 border-[#2f6f99] object-cover short:size-9" />
                <span className="absolute top-1 left-11 rounded-xl bg-cream px-2.5 py-1 text-[13px] font-bold text-[#12402a] shadow-[0_4px_10px_rgb(0_0_0/0.35)] short:top-0 short:left-8 short:px-2 short:text-[11px]">
                    Ooh!
                    <span className="absolute -bottom-1 left-1.5 size-2.5 rotate-45 rounded-[2px] bg-cream" />
                </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span id={id} className="text-[17px] font-bold short:text-base">How chatty</span>
                <span className="text-sm leading-snug text-muted-foreground short:text-[13.5px]">{TALK_LEVELS.find(option => option.level === talk)!.about}</span>
            </span>
            <div role="group" aria-labelledby={id} className="grid flex-none grid-cols-3 gap-1 rounded-xl bg-black/30 p-1 short:p-0.5">
                {TALK_LEVELS.map(option => (
                    <Button
                        key={option.level}
                        variant="ghost"
                        aria-pressed={talk === option.level}
                        onClick={() => onTalkChange(option.level)}
                        className="px-3.5 aria-pressed:bg-cream aria-pressed:text-[#12402a] aria-pressed:hover:bg-cream aria-pressed:hover:text-[#12402a] short:px-3 short:text-[15px]"
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    hints: Hints;
    onHintsChange: (hints: Hints) => void;
    talk: TalkLevel;
    onTalkChange: (level: TalkLevel) => void;
    /** opened from a game, which waits while it's open */
    inGame?: boolean;
}

// Your settings: how much table talk, and the hints. A dialog, or on a phone
// a sheet that fills the screen. Each change is kept as it's made.
function SettingsDialog({open, onOpenChange, hints, onHintsChange, talk, onTalkChange, inGame = false}: SettingsDialogProps) {
    let short = useMediaQuery("(max-height: 560px)");
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
                        className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-2.5 overflow-y-auto rounded-none bg-card px-5 pt-0 pb-4 ring-0 sm:max-w-none"
                    >
                        <header className="flex h-14 flex-none items-center gap-3">
                            <DialogTitle className="text-[26px] leading-none">Settings</DialogTitle>
                            <DialogDescription className="mt-0.5 min-w-0 truncate text-sm">
                                {inGame ? "The game is paused while this is open." : "Kept on this device."}
                            </DialogDescription>
                            <span className="flex-1" />
                            {done}
                        </header>
                        <h3 className={sectionLabel}>Table talk</h3>
                        <TalkChoice talk={talk} onTalkChange={onTalkChange} />
                        <h3 className={cn(sectionLabel, "mt-1.5")}>Hints</h3>
                        <HintList hints={hints} onHintsChange={onHintsChange} />
                    </DialogContent>
                )
                : (
                    <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4.5 overflow-y-auto px-7 py-6 sm:max-w-[640px]">
                        <DialogTitle className="text-3xl">Settings</DialogTitle>
                        <div className="flex flex-col gap-1">
                            <h3 className={sectionLabel}>Table talk</h3>
                            <p className="text-[15px] text-muted-foreground">What your opponents say as they play: grumbles, bluffs and banter.</p>
                        </div>
                        <TalkChoice talk={talk} onTalkChange={onTalkChange} />
                        <div className="flex flex-col gap-1">
                            <h3 className={sectionLabel}>Hints</h3>
                            <p className="text-[15px] text-muted-foreground">Help while you play. Turn them off for a sterner game.</p>
                        </div>
                        <HintList hints={hints} onHintsChange={onHintsChange} />
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
