import {useEffect, useState} from 'react';
import {motion} from 'motion/react';
import {Button} from '@/components/ui/button.tsx';
import {createCard} from '@/engine/cards.ts';
import {PlayingCard} from './playing-card.tsx';
import {preloadCardImages} from './cards.ts';
import RulesDialog from './rules-dialog.tsx';

const FAN = [createCard(10, "H", "10H"), createCard(11, "C", "11C"), createCard(12, "D", "12D"), createCard(13, "S", "13S"), createCard(1, "H", "1H")];

// The title screen. On a phone held sideways (a short screen) the fan of
// cards sits beside the title, so it all fits on one screen.
function Home({onStartGame}: {onStartGame: () => void}) {
    let [showRules, setShowRules] = useState(false);
    // load the card faces while the player reads the home screen
    useEffect(preloadCardImages, []);
    return (
        <main className="grid min-h-dvh place-items-center bg-felt p-6 shadow-[inset_0_0_180px_rgb(0_0_0/0.4)] short:p-4">
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
                        <Button size="lg" onClick={onStartGame} className="px-8 text-lg">Start game</Button>
                        <Button size="lg" variant="outline" onClick={() => setShowRules(true)}>How to play</Button>
                    </div>
                </div>
            </div>
            <RulesDialog open={showRules} onOpenChange={setShowRules} />
        </main>
    );
}

export default Home;
