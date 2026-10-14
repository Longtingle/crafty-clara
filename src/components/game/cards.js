// Card faces are half-size WebP versions of the PNGs in art/card-faces. They
// live in public/, which is served from the base URL.
const cardImage = (displayString) => import.meta.env.BASE_URL + "img/cards/" + displayString + ".webp";

// Fetch every face up front, so a card never arrives blank mid-flight.
let preloaded = false;
const preloadCardImages = () => {
    if (preloaded) return;
    preloaded = true;
    for (let suit of ["C", "D", "H", "S"]) {
        for (let value = 1; value <= 13; value++) new Image().src = cardImage(value + suit);
    }
}

// How cards move: a short spring with a little overshoot.
const FLIGHT = {type : "spring", duration : 0.5, bounce : 0.18};

export {cardImage, preloadCardImages, FLIGHT};
