import {AnimatePresence} from 'motion/react';
import {cn} from '@/lib/utils.js';
import {CardBack, MovingCard} from './playing-card.jsx';
import {MeldRow} from './meld.jsx';
import {aiColor} from './players.js';

// Where an opponent's cards fly to and from. Their hand is hidden (the view
// gives only the cards' ids), so each card is a small back, all stacked in one
// spot. A card that arrives shows while it flies in, then fades out over the
// static card backs underneath; the cards dealt at the start (initial={false})
// start out hidden.
function HiddenHand({ids, className}) {
    return (
        <AnimatePresence initial={false}>
            {ids.map(id => (
                <MovingCard
                    key={id}
                    id={id}
                    initial={{opacity : 1}}
                    animate={{opacity : 0, transition : {delay : 0.45, duration : 0.2}}}
                    className={cn("absolute", className)}
                >
                    <CardBack className="w-full border-[1.5px]" />
                </MovingCard>
            ))}
        </AnimatePresence>
    );
}

function Chip({gold, children}) {
    return (
        <span className={cn(
            "rounded-full px-2 py-px text-[11px] font-bold tracking-wider whitespace-nowrap uppercase",
            gold ? "bg-gold text-gold-foreground" : "border border-white/40"
        )}>
            {children}
        </span>
    );
}

function Avatar({color, label, className}) {
    return (
        <span
            aria-hidden="true"
            className={cn("grid size-11 flex-none place-items-center rounded-full font-bold text-white short:size-8", className)}
            style={{backgroundColor : color}}
        >
            {label}
        </span>
    );
}

// An opponent's name, status and score, with their setruns (children) below.
// player is their seat in the view. The line under the name shows what they
// are saying, or else their last move.
function OpponentPanel({player, index, active, speech, lastAction, children}) {
    let status = speech ? "“" + speech + "”" : (lastAction ?? "Waiting for their turn");
    return (
        <div className="flex min-w-0 flex-col gap-3 compact:gap-2">
            <div className={cn(
                "flex items-center gap-3 rounded-2xl border-2 bg-panel px-3.5 py-2.5 compact:py-1.5 short:px-2.5",
                active ? "border-gold" : "border-border"
            )}>
                <Avatar color={aiColor(index)} label={index + 1} className="text-lg short:text-sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className="truncate font-bold">{player.name}</span>
                        {active && <Chip gold>Playing</Chip>}
                        {player.isDown && <Chip>Down</Chip>}
                    </div>
                    <span className={cn("truncate text-[13px] text-muted-foreground short:hidden", speech && "italic")}>
                        {status}
                    </span>
                </div>
                <div className="flex flex-none flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-2 text-sm font-bold">
                        <span aria-hidden="true" className="relative h-6 w-7">
                            <CardBack className="absolute top-0.5 left-0 w-[15px] -rotate-12 border-[1.5px]" />
                            <CardBack className="absolute top-0 left-1.5 w-[15px] border-[1.5px]" />
                            <CardBack className="absolute top-0.5 left-3 w-[15px] rotate-12 border-[1.5px]" />
                            <HiddenHand ids={player.cards} className="top-0 left-1.5 w-[15px]" />
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

export {OpponentPanel, HiddenHand, Chip, Avatar};
