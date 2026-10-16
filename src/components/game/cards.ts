import {SUITS} from '@/engine/cards.ts';

// Card faces are half-size WebP versions of the PNGs in art/card-faces. They
// live in public/, which is served from the base URL.
const cardImage = (displayString: string): string => import.meta.env.BASE_URL + "img/cards/" + displayString + ".webp";

// Fetch every face up front, so a card never arrives blank mid-flight. On a
// first visit, the service worker downloads them too (it keeps the whole
// site), so wait until it's done and take them from it, rather than
// downloading them twice; and let the page's fonts come first.
let preloaded = false;
const preloadCardImages = (): void => {
    if (preloaded) return;
    preloaded = true;
    let worker = (import.meta.env.PROD && "serviceWorker" in navigator) ? navigator.serviceWorker.ready : null;
    void Promise.all([worker, document.fonts?.ready]).then(() => {
        for (let suit of SUITS) {
            for (let value = 1; value <= 13; value++) new Image().src = cardImage(value + suit);
        }
    });
}

export {cardImage, preloadCardImages};
