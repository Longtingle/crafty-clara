import {cn} from '@/lib/utils.js';
import {Avatar, Chip} from './opponent-panel.jsx';
import {YOU_COLOR} from './players.js';

function PlayerPanel({active, isDown, score, cardCount}) {
    return (
        <div className={cn(
            "flex items-center gap-3 rounded-2xl border-2 bg-panel px-3.5 py-3 short:px-2.5 short:py-1.5",
            active ? "border-gold" : "border-border"
        )}>
            <Avatar color={YOU_COLOR} label="You" className="text-sm text-[#12402a] short:text-[11px]" />
            <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">You</span>
                    {active && <Chip gold>Playing</Chip>}
                    {isDown && <span className="short:hidden"><Chip>Down</Chip></span>}
                </div>
                <span className="text-[13px] text-muted-foreground">
                    {score} pts<span className="short:hidden"> · {cardCount} cards</span>
                </span>
            </div>
        </div>
    );
}

export default PlayerPanel;
