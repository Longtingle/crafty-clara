import {cn} from '@/lib/utils.js';
import {setrunCaption, isStandIn} from '@/game-functions/card-names.js';
import {PlayingCard} from './playing-card.jsx';

// A setrun on the table. It is a button only while the selected card can be
// added to it (target is then {label}, e.g. "Add 7♦" or "Swap for A♥").
function Meld({setrun, target, dimmed, onClick}) {
    let caption = setrunCaption(setrun);
    let hasWild = setrun.cards.some(isStandIn);
    return (
        <button
            type="button"
            disabled={!target}
            onClick={onClick}
            aria-label={caption + (hasWild ? ", with a wild ace" : "") + (target ? ". " + target.label : "")}
            className={cn(
                "relative flex flex-none flex-col items-start gap-1.5 rounded-xl border-2 border-transparent bg-black/18 px-2.5 pt-3 pb-1.5 transition short:px-1.5 short:pt-2.5 short:pb-1",
                target && "border-gold shadow-[0_0_0_5px_rgb(245_184_61/0.22)] hover:brightness-110",
                dimmed && "opacity-50"
            )}
        >
            <span className="meld-fan flex">
                {setrun.cards.map((card, index) => (
                    <PlayingCard key={index} card={card} setrunType={setrun.type} alt="" className="w-(--meld-w)" />
                ))}
            </span>
            <span className="text-xs text-muted-foreground short:hidden">{caption}</span>
            {target && (
                <span className="absolute -top-3 right-2 rounded-full bg-gold px-2 py-0.5 text-xs font-bold whitespace-nowrap text-gold-foreground">
                    {target.label}
                </span>
            )}
        </button>
    );
}

export default Meld;
