import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog.jsx';
import Scoreboard from './scoreboard.jsx';
import {scoreRows} from './scores.js';

function ScoresDialog({open, onOpenChange, view}) {
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
