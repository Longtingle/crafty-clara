import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog.tsx';
import type {GameView} from '@/engine/view.ts';
import Scoreboard from './scoreboard.tsx';
import {scoreRows} from './scores.ts';

interface ScoresDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    view: GameView;
}

function ScoresDialog({open, onOpenChange, view}: ScoresDialogProps) {
    let roundsPlayed = view.seats[view.seat].scores.length;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[880px]">
                <DialogHeader>
                    <DialogTitle>Scores</DialogTitle>
                    <DialogDescription>
                        {roundsPlayed === 0
                            ? "No rounds finished yet. Cards left in your hand at the end of a round count against you."
                            : "Lowest total after round " + view.rounds + " wins."}
                    </DialogDescription>
                </DialogHeader>
                {roundsPlayed > 0 && <Scoreboard rows={scoreRows(view)} roundCount={view.rounds} />}
            </DialogContent>
        </Dialog>
    );
}

export default ScoresDialog;
