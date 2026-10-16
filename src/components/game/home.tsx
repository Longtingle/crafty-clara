import {useEffect, useState} from 'react';
import {motion} from 'motion/react';
import {ChartColumn, Settings} from 'lucide-react';
import {Button} from '@/components/ui/button.tsx';
import {createCard, ROUND_REQUIREMENTS} from '@/engine/cards.ts';
import type {Hints, TalkLevel} from '@/storage/settings.ts';
import {PlayingCard} from './playing-card.tsx';
import {preloadCardImages} from './cards.ts';
import RulesDialog from './rules-dialog.tsx';
import SettingsDialog from './settings-dialog.tsx';

const FAN = [createCard(10, "H", "10H"), createCard(11, "C", "11C"), createCard(12, "D", "12D"), createCard(13, "S", "13S"), createCard(1, "H", "1H")];

interface HomeProps {
    /** the round (from 0) of a saved game you can carry on, if there is one */
    savedRound: number | null;
    onContinue: () => void;
    onStartGame: () => void;
    onShowStats: () => void;
    hints: Hints;
    onHintsChange: (hints: Hints) => void;
    talk: TalkLevel;
    onTalkChange: (level: TalkLevel) => void;
}

// The title screen. With a game saved from last time, carrying it on comes
// first. On a phone held sideways (a short screen) the fan of cards sits
// beside the title, so it all fits on one screen. Your stats and the
// settings are in a corner: the top right, or on a phone the top left as
// icons, clear of the title.
function Home({savedRound, onContinue, onStartGame, onShowStats, hints, onHintsChange, talk, onTalkChange}: HomeProps) {
    let [showRules, setShowRules] = useState(false);
    let [showSettings, setShowSettings] = useState(false);
    // load the card faces while the player reads the home screen
    useEffect(preloadCardImages, []);
    return (
        <main className="relative grid min-h-dvh place-items-center bg-felt p-6 shadow-[inset_0_0_180px_rgb(0_0_0/0.4)] short:p-4">
            <nav aria-label="More" className="absolute top-5 right-5 flex gap-1 short:top-1.5 short:right-auto short:left-1.5 short:gap-0.5">
                <Button variant="ghost" onClick={onShowStats} className="pr-4 pl-3 short:size-11 short:p-0">
                    <ChartColumn aria-hidden="true" className="size-5 short:size-5.5" strokeWidth={2.25} />
                    <span className="short:sr-only">Your stats</span>
                </Button>
                <Button variant="ghost" onClick={() => setShowSettings(true)} className="pr-4 pl-3 short:size-11 short:p-0">
                    <Settings aria-hidden="true" className="size-5 short:size-5.5" strokeWidth={2.25} />
                    <span className="short:sr-only">Settings</span>
                </Button>
            </nav>
            <div className="flex flex-col items-center gap-8 text-center short:flex-row short:gap-[clamp(16px,4vw,48px)] short:text-left">
                <div aria-hidden="true" className="flex h-[clamp(110px,22vh,190px)] flex-none items-end pt-4 short:h-auto short:px-7 short:pt-0 short:pb-4">
                    {FAN.map((card, index) => (
                        <motion.span
                            key={card.displayString}
                            className="-mx-3 block w-[clamp(72px,9vh,120px)] origin-bottom short:w-[clamp(48px,min(10vw,26vh),84px)]"
                            initial={{rotate : 0, x : (2 - index) * 40, y : 0}}
                            animate={{rotate : (index - 2) * 9, x : 0, y : Math.abs(index - 2) * 8}}
                            transition={{type : "spring", duration : 0.8, bounce : 0.25, delay : 0.15}}
                        >
                            <PlayingCard card={card} alt="" className="w-full shadow-xl" />
                        </motion.span>
                    ))}
                </div>
                <div className="flex flex-col items-center gap-8 short:items-start short:gap-5">
                    <div className="flex flex-col gap-3 short:gap-2">
                        <h1 className="font-heading text-[clamp(48px,9vw,88px)] leading-none font-extrabold tracking-tight short:text-[clamp(36px,7vw,60px)]">
                            Crafty Clara
                        </h1>
                        <p className="text-lg text-muted-foreground short:text-base">Contract rummy against crafty computer opponents.</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 short:justify-start">
                        {(savedRound === null)
                            ? <Button size="lg" onClick={onStartGame} className="px-8 text-lg">Start game</Button>
                            : (
                                <>
                                    <Button size="lg" onClick={onContinue} className="px-8 text-lg">
                                        Continue game{" "}
                                        <span className="text-base font-normal opacity-80">· Round {savedRound + 1} of {ROUND_REQUIREMENTS.length}</span>
                                    </Button>
                                    <Button size="lg" variant="outline" onClick={onStartGame}>New game</Button>
                                </>
                            )}
                        <Button size="lg" variant="outline" onClick={() => setShowRules(true)}>How to play</Button>
                    </div>
                </div>
            </div>
            <RulesDialog open={showRules} onOpenChange={setShowRules} />
            <SettingsDialog open={showSettings} onOpenChange={setShowSettings} hints={hints} onHintsChange={onHintsChange} talk={talk} onTalkChange={onTalkChange} />
        </main>
    );
}

export default Home;
