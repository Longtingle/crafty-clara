import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog.jsx';
import {ROUND_REQUIREMENTS} from '@/store/constants.js';
import {requirementText} from '@/engine/card-names.ts';

function Section({title, children}) {
    return (
        <section className="flex flex-col gap-1.5">
            <h3 className="font-heading text-lg font-bold">{title}</h3>
            <div className="flex flex-col gap-1.5 leading-relaxed text-muted-foreground [&_strong]:text-foreground">{children}</div>
        </section>
    );
}

function RulesDialog({open, onOpenChange}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[640px]">
                <DialogHeader>
                    <DialogTitle>How to play</DialogTitle>
                    <DialogDescription>
                        Crafty Clara is contract rummy against computer opponents. Get rid of your cards:
                        whatever is left in your hand when someone goes out counts against you, and the lowest
                        total after {ROUND_REQUIREMENTS.length} rounds wins.
                    </DialogDescription>
                </DialogHeader>

                <Section title="Melds">
                    <p>A <strong>set</strong> is 3 or more cards of the same value. A <strong>run</strong> is 4 or more cards in a row, all one suit. Aces can be low (A 2 3) or high (Q K A).</p>
                    <p><strong>Red aces are wild</strong>, but a meld can't have more wilds than natural cards. If someone plays the card a wild ace stands in for, it replaces the ace and the ace goes back to their hand.</p>
                </Section>

                <Section title="Each round">
                    <p>To <strong>go down</strong> you lay down the melds the round asks for:</p>
                    <ol className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                        {ROUND_REQUIREMENTS.map((requirement, round) => (
                            <li key={round} className="contents">
                                <span>Round {round + 1}</span>
                                <span className="text-foreground">{requirementText(requirement)}</span>
                            </li>
                        ))}
                    </ol>
                </Section>

                <Section title="Your turn">
                    <p>Draw from the deck or take the top card of the discard pile. Go down if you can. Once you're down you can add cards to anyone's melds. Then discard a card to end your turn.</p>
                    <p>The round ends as soon as someone has no cards left.</p>
                </Section>

                <Section title="Claiming out of turn">
                    <p>When an opponent draws from the deck instead of taking the discard, you have a few seconds to <strong>claim</strong> it. If several players claim, the first one after the current player gets it.</p>
                </Section>

                <Section title="Scoring">
                    <p>Cards left in your hand: aces 25, tens and picture cards 10, everything else its number.</p>
                </Section>
            </DialogContent>
        </Dialog>
    );
}

export default RulesDialog;
