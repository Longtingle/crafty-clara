import type {ReactNode} from 'react';
import {cn} from '@/lib/utils.ts';
import type {CharacterId} from '@/engine/cast.ts';
import {portraitImage} from './players.ts';

// The badges by a player's name, used all over: on the table, the
// scoreboard and the new-game screen. They're kept apart from the table's
// components, so a screen that shows them doesn't load the table.

// A small tag by a name: gold for whose turn it is, cream for a hard bot,
// and an outline for anything else.
function Chip({tone = "outline", children}: {tone?: "gold" | "cream" | "outline"; children: ReactNode}) {
    return (
        <span className={cn(
            "rounded-full px-2 py-px text-[11px] font-bold tracking-wider whitespace-nowrap uppercase",
            {gold : "bg-gold text-gold-foreground", cream : "bg-cream text-[#12402a]", outline : "border border-white/40"}[tone]
        )}>
            {children}
        </span>
    );
}

interface AvatarProps {
    color: string;
    /** what it says, without a portrait: an opponent's number, or "You" */
    label: ReactNode;
    /** whose portrait it shows, in a ring of their colour */
    character?: CharacterId | null;
    className?: string;
}

// A player's badge: a character's portrait in a ring of their colour, or else
// their colour with a label.
function Avatar({color, label, character, className}: AvatarProps) {
    if (character) {
        return (
            <span aria-hidden="true" className={cn("block size-11 flex-none rounded-full p-[3px]", className)} style={{backgroundColor : color}}>
                <img src={portraitImage(character)} alt="" draggable={false} className="block size-full rounded-full object-cover" />
            </span>
        );
    }
    return (
        <span
            aria-hidden="true"
            className={cn("grid size-11 flex-none place-items-center rounded-full font-bold text-white", className)}
            style={{backgroundColor : color}}
        >
            {label}
        </span>
    );
}

export {Avatar, Chip};
