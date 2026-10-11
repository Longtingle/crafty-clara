import {cn} from '@/lib/utils.js';
import {ENV_VAR} from '@/store/constants.js';
import {longName, isStandIn, standInName} from '@/game-functions/card-names.js';

const cardImage = (card) => ENV_VAR.IMG_DIR + "/cards/" + card.displayString + ".png";

// A card face. Size it with a width class; the height follows the image.
// Inside a setrun (setrunType set), a wild ace shows what it stands in for.
function PlayingCard({card, setrunType, alt, className, style}) {
    return (
        <span className={cn("relative block card-face", className)} style={style}>
            <img
                src={cardImage(card)}
                alt={alt ?? longName(card)}
                draggable={false}
                className="block size-full rounded-[5%/3.3%] shadow-[0_2px_6px_rgb(0_0_0/0.35)]"
            />
            {setrunType && isStandIn(card) && (
                <span className="absolute -top-2.5 left-0 rounded-full border-[1.5px] border-white bg-wild px-1.5 text-[11px] leading-4 font-bold whitespace-nowrap text-white">
                    {"=" + standInName(card, setrunType)}
                </span>
            )}
        </span>
    );
}

function CardBack({className}) {
    return <span aria-hidden="true" className={cn("block card-back", className)} />;
}

// A small pill on top of a card, such as "New" on the card just drawn.
function CardTag({children, className}) {
    return (
        <span className={cn("absolute -top-3 left-1.5 rounded-full bg-cream px-2 py-px text-[11px] font-bold tracking-wider whitespace-nowrap text-[#12402a] uppercase", className)}>
            {children}
        </span>
    );
}

export {PlayingCard, CardBack, CardTag};
