import {useMediaQuery} from '@/lib/use-media-query.ts';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog.tsx';
import type {CharacterId} from '@/engine/cast.ts';
import type {GameView} from '@/engine/view.ts';
import Scoreboard from './scoreboard.tsx';
import {scoreRows} from './scores.ts';

interface ScoresDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    view: GameView;
    /** who sits in each seat, by seat */
    characters: (CharacterId | null)[];
}

function ScoresDialog({open, onOpenChange, view, characters}: ScoresDialogProps) {
    let roundsPlayed = view.seats[view.seat].scores.length;
    // a phone gets the tighter table, so it fits without scrolling
    let short = useMediaQuery("(max-height: 560px)");
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[880px] short:max-h-[calc(100dvh-1rem)] short:gap-3 short:p-4">
                <DialogHeader>
                    <DialogTitle>Scores</DialogTitle>
                    <DialogDescription>
                        {roundsPlayed === 0
                            ? "No rounds finished yet. Cards left in your hand at the end of a round count against you."
                            : "Lowest total after round " + view.rounds + " wins."}
                    </DialogDescription>
                </DialogHeader>
                {roundsPlayed > 0 && <Scoreboard rows={scoreRows(view, false, characters)} roundCount={view.rounds} compact={short} />}
            </DialogContent>
        </Dialog>
    );
}

export default ScoresDialog;
