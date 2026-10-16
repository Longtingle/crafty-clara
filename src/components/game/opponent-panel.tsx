import type {ReactNode} from 'react';
import {AnimatePresence} from 'motion/react';
import {cn} from '@/lib/utils.ts';
import type {Card} from '@/engine/cards.ts';
import type {CharacterId} from '@/engine/cast.ts';
import type {SeatView} from '@/engine/view.ts';
import {CardBack, MovingCard, PlayingCard} from './playing-card.tsx';
import {useFlight} from './flight.ts';
import {MeldRow} from './meld.tsx';
import {aiColor} from './players.ts';
import {Avatar, Chip} from './avatar.tsx';
import SpeechBubble, {type Bubble} from './speech-bubble.tsx';

interface HiddenHandProps {
    ids: string[];
    /** the cards in it everyone knows (knownCards), which show their faces */
    known?: Record<string, Card>;
    className?: string;
}

// Where an opponent's cards fly to and from. Their hand is hidden (the view
// gives only the cards' ids), so each card is a small back, all stacked in one
// spot, except a card everyone saw them take, which keeps its face. A card
// that arrives shows while it flies in, and a moment after (longer at a
// slower game speed), then fades out over the static card backs underneath;
// the cards dealt at the start (initial={false}) start out hidden.
function HiddenHand({ids, known = {}, className}: HiddenHandProps) {
    let {linger} = useFlight();
    return (
        <AnimatePresence initial={false}>
            {ids.map(id => (
                <MovingCard
                    key={id}
                    id={id}
                    initial={{opacity : 1}}
                    animate={{opacity : 0, transition : {delay : linger, duration : 0.2}}}
                    className={cn("absolute", className)}
                >
                    {known[id]
                        ? <PlayingCard card={known[id]} alt="" className="w-full" />
                        : <CardBack className="w-full border-[1.5px]" />}
                </MovingCard>
            ))}
        </AnimatePresence>
    );
}

interface OpponentPanelProps {
    player: SeatView;
    /** their opponent number, from 0 */
    index: number;
    /** whether they're a hard bot */
    hard: boolean;
    /** who they are, if one of the cast */
    character?: CharacterId | null;
    /** the cards in their hand everyone knows (knownCards) */
    known?: Record<string, Card>;
    active: boolean;
    /** what they're saying, if anything */
    speech: Bubble | null | undefined;
    lastAction: string | null;
    /** their setruns */
    children: ReactNode;
}

// An opponent's name, their last move, and their score, with their setruns
// below. What they say pops up in a bubble from their portrait, over their
// setruns.
function OpponentPanel({player, index, hard, character, known, active, speech, lastAction, children}: OpponentPanelProps) {
    return (
        <div className="flex min-w-0 flex-col gap-3 compact:gap-2">
            <div className={cn(
                "relative flex items-center gap-3 rounded-2xl border-2 bg-panel px-3.5 py-2.5 compact:py-1.5",
                active ? "border-gold" : "border-border"
            )}>
                <SpeechBubble bubble={speech} name={player.name} from="above" className="top-full left-1.5 mt-2.5 max-w-[min(320px,100%)]" />
                <Avatar color={aiColor(index)} label={index + 1} character={character} className={cn("text-lg", character && "size-12")} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className="truncate font-bold">{player.name}</span>
                        {hard && <Chip tone="cream">Hard</Chip>}
                        {active && <Chip tone="gold">Playing</Chip>}
                        {player.isDown && <Chip>Down</Chip>}
                    </div>
                    <span className="truncate text-[13px] text-muted-foreground">
                        {lastAction ?? "Waiting for their turn"}
                    </span>
                </div>
                <div className="flex flex-none flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-2 text-sm font-bold">
                        <span aria-hidden="true" className="relative h-6 w-7">
                            <CardBack className="absolute top-0.5 left-0 w-[15px] -rotate-12 border-[1.5px]" />
                            <CardBack className="absolute top-0 left-1.5 w-[15px] border-[1.5px]" />
                            <CardBack className="absolute top-0.5 left-3 w-[15px] rotate-12 border-[1.5px]" />
                            <HiddenHand ids={player.cards} known={known} className="top-0 left-1.5 w-[15px]" />
                        </span>
                        {player.cards.length} cards
                    </span>
                    <span className="text-[13px] text-muted-foreground">{player.total} pts</span>
                </div>
            </div>
            <MeldRow setruns={player.isDown ? player.table : []} className="min-h-(--meld-row) items-start">
                {player.isDown ? children : (
                    <div className="grid h-(--meld-row) flex-1 place-items-center rounded-xl border-2 border-dashed border-white/18 text-sm text-muted-foreground">
                        Not down yet
                    </div>
                )}
            </MeldRow>
        </div>
    );
}

export {OpponentPanel, HiddenHand};
