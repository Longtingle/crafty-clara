import {Button} from '@/components/ui/button.tsx';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog.tsx';

// Shown while the game is paused. Closing it any way (the button, Escape,
// clicking outside) carries on with the game.
function PauseDialog({open, onResume}: {open: boolean; onResume: () => void}) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onResume(); }}>
            <DialogContent className="sm:max-w-md" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle className="text-3xl">Paused</DialogTitle>
                    <DialogDescription>Nothing moves until you come back.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button size="lg" onClick={onResume} className="px-8 text-lg">Resume</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default PauseDialog;
