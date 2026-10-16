import {cn} from '@/lib/utils.ts';
import {Avatar, Chip} from './avatar.tsx';
import {YOU_COLOR} from './players.ts';

interface PlayerPanelProps {
    active: boolean;
    isDown: boolean;
    score: number;
    cardCount: number;
}

function PlayerPanel({active, isDown, score, cardCount}: PlayerPanelProps) {
    return (
        <div className={cn(
            "flex items-center gap-3 rounded-2xl border-2 bg-panel px-3.5 py-3",
            active ? "border-gold" : "border-border"
        )}>
            <Avatar color={YOU_COLOR} label="You" className="text-sm text-cream-foreground" />
            <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">You</span>
                    {active && <Chip tone="gold">Playing</Chip>}
                    {isDown && <Chip>Down</Chip>}
                </div>
                <span className="text-[13px] text-muted-foreground">
                    {score} pts · {cardCount} cards
                </span>
            </div>
        </div>
    );
}

export default PlayerPanel;
