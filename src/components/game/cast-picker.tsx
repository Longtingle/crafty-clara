import {Shuffle, X} from 'lucide-react';
import {cn} from '@/lib/utils.ts';
import {useShortScreen} from '@/lib/use-media-query.ts';
import {Button} from '@/components/ui/button.tsx';
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog.tsx';
import {CAST, type CharacterId} from '@/engine/cast.ts';
import {portraitImage} from './players.ts';

interface CastPickerProps {
    open: boolean;
    /** "Who plays straight after you?" */
    title: string;
    /** who's in the seat now */
    current: CharacterId;
    /** who's in the other seats, and can't be picked */
    taken: CharacterId[];
    onPick: (id: CharacterId) => void;
    onClose: () => void;
}

const DESCRIPTION = "Everyone has their own way of playing, and talking. You'll get to know them.";

// Who sits in a seat: the whole cast, each with their portrait, name and
// manner. Anyone already at the table is greyed out. A dialog, or on a phone
// a sheet that fills the screen, with each portrait beside its name to fit.
function CastPicker({open, title, current, taken, onPick, onClose}: CastPickerProps) {
    let short = useShortScreen();
    let free = CAST.filter(c => c.id !== current && !taken.includes(c.id));
    let random = (
        <Button
            variant="outline"
            disabled={free.length === 0}
            onClick={() => onPick(free[Math.floor(Math.random() * free.length)].id)}
            className="short:h-10 short:px-3 short:text-sm"
        >
            <Shuffle aria-hidden="true" />Anyone, at random
        </Button>
    );
    let grid = (
        <ul className="grid grid-cols-4 gap-3 short:gap-1.5">
            {CAST.map(c => {
                let picked = c.id === current;
                let playing = taken.includes(c.id);
                return (
                    <li key={c.id}>
                        <button
                            type="button"
                            aria-pressed={picked}
                            disabled={playing}
                            onClick={() => onPick(c.id)}
                            className={cn(
                                "relative flex size-full flex-col items-center gap-1.5 rounded-2xl border-2 px-2.5 pt-3.5 pb-3 text-center transition-colors short:flex-row short:gap-2 short:rounded-xl short:px-2 short:py-2 short:text-left",
                                picked ? "border-gold bg-gold/12" : "border-white/10 bg-black/18 enabled:hover:border-white/30",
                                playing && "opacity-45"
                            )}
                        >
                            <img
                                src={portraitImage(c.id)}
                                alt=""
                                draggable={false}
                                className={cn("size-24 flex-none rounded-full border-3 object-cover short:size-11 short:border-2", picked ? "border-gold" : "border-white/25")}
                            />
                            <span className="flex min-w-0 flex-col gap-1.5 short:gap-0.5">
                                <span className="text-[17px] font-bold short:text-sm short:leading-tight">{c.name}</span>
                                <span className="text-[13px] leading-snug text-cream italic short:text-[11.5px] short:leading-tight">“{c.manner}”</span>
                            </span>
                            {(picked || playing) && (
                                <span className={cn(
                                    "absolute top-2 right-2 rounded-full px-2 py-px text-[11px] font-bold tracking-wider uppercase short:-top-2 short:right-1.5 short:px-1.5 short:text-[9.5px]",
                                    picked ? "bg-gold text-gold-foreground" : "border border-white/50 bg-card"
                                )}>
                                    {picked ? "Picked" : "Playing"}
                                </span>
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );

    return (
        <Dialog open={open} onOpenChange={(isOpen) => isOpen || onClose()}>
            {short
                ? (
                    <DialogContent
                        showCloseButton={false}
                        sheet
                        className="flex flex-col gap-1.5 overflow-y-auto px-4 pt-0 pb-2"
                    >
                        <header className="flex h-12 flex-none items-center gap-3">
                            <DialogTitle className="min-w-0 truncate text-[22px] leading-none">{title}</DialogTitle>
                            <DialogDescription className="sr-only">{DESCRIPTION}</DialogDescription>
                            <span className="flex-1" />
                            {random}
                            <DialogClose asChild>
                                <Button variant="ghost" size="icon" aria-label="Close" className="-mr-2"><X aria-hidden="true" /></Button>
                            </DialogClose>
                        </header>
                        {grid}
                    </DialogContent>
                )
                : (
                    <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4.5 overflow-y-auto px-7 py-6 sm:max-w-[820px]">
                        <div className="flex flex-col gap-1">
                            <DialogTitle className="text-3xl">{title}</DialogTitle>
                            <DialogDescription className="text-[15px]">{DESCRIPTION}</DialogDescription>
                        </div>
                        {grid}
                        <div className="flex justify-end">{random}</div>
                    </DialogContent>
                )}
        </Dialog>
    );
}

export default CastPicker;
