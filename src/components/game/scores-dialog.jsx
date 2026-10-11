import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog.jsx';
import {ROUND_REQUIREMENTS} from '@/store/constants.js';
import Scoreboard from './scoreboard.jsx';
import {scoreRows} from './scores.js';

function ScoresDialog({open, onOpenChange, player, AIPlayers}) {
    let roundsPlayed = player.points.points.length;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[880px]">
                <DialogHeader>
                    <DialogTitle>Scores</DialogTitle>
                    <DialogDescription>
                        {roundsPlayed === 0
                            ? "No rounds finished yet. Cards left in your hand at the end of a round count against you."
                            : "Lowest total after round " + ROUND_REQUIREMENTS.length + " wins."}
                    </DialogDescription>
                </DialogHeader>
                {roundsPlayed > 0 && (
                    <Scoreboard rows={scoreRows(player, AIPlayers)} roundCount={ROUND_REQUIREMENTS.length} />
                )}
            </DialogContent>
        </Dialog>
    );
}

export default ScoresDialog;
