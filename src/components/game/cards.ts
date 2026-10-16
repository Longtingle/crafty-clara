import {SUITS} from '@/engine/cards.ts';

// Card faces are half-size WebP versions of the PNGs in art/card-faces. They
// live in public/, which is served from the base URL.
const cardImage = (displayString: string): string => import.meta.env.BASE_URL + "img/cards/" + displayString + ".webp";

// Fetch every face up front, so a card never arrives blank mid-flight.
let preloaded = false;
const preloadCardImages = (): void => {
    if (preloaded) return;
    preloaded = true;
    for (let suit of SUITS) {
        for (let value = 1; value <= 13; value++) new Image().src = cardImage(value + suit);
    }
}

export {cardImage, preloadCardImages};
