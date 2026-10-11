import {useEffect, useState} from 'react';
import {motion} from 'motion/react';
import {Button} from '@/components/ui/button.jsx';
import {createCard} from '@/game-functions/deck-functions.js';
import {PlayingCard} from './playing-card.jsx';
import {preloadCardImages} from './cards.js';
import RulesDialog from './rules-dialog.jsx';

const FAN = [createCard(10, "H"), createCard(11, "C"), createCard(12, "D"), createCard(13, "S"), createCard(1, "H")];

function Home({onStartGame}) {
    let [showRules, setShowRules] = useState(false);
    // load the card faces while the player reads the home screen
    useEffect(preloadCardImages, []);
    return (
        <main className="grid min-h-dvh place-items-center bg-felt p-6 shadow-[inset_0_0_180px_rgb(0_0_0/0.4)]">
            <div className="flex flex-col items-center gap-8 text-center">
                <div aria-hidden="true" className="flex h-[clamp(110px,22vh,190px)] items-end pt-4">
                    {FAN.map((card, index) => (
                        <motion.span
                            key={card.displayString}
                            className="-mx-3 block w-[clamp(72px,9vh,120px)] origin-bottom"
                            initial={{rotate : 0, x : (2 - index) * 40, y : 0}}
                            animate={{rotate : (index - 2) * 9, x : 0, y : Math.abs(index - 2) * 8}}
                            transition={{type : "spring", duration : 0.8, bounce : 0.25, delay : 0.15}}
                        >
                            <PlayingCard card={card} alt="" className="w-full shadow-xl" />
                        </motion.span>
                    ))}
                </div>
                <div className="flex flex-col gap-3">
                    <h1 className="font-heading text-[clamp(48px,9vw,88px)] leading-none font-extrabold tracking-tight">Crafty Clara</h1>
                    <p className="text-lg text-muted-foreground">Contract rummy against crafty computer opponents.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button size="lg" onClick={onStartGame} className="px-8 text-lg">Start game</Button>
                    <Button size="lg" variant="outline" onClick={() => setShowRules(true)}>How to play</Button>
                </div>
            </div>
            <RulesDialog open={showRules} onOpenChange={setShowRules} />
        </main>
    );
}

export default Home;
