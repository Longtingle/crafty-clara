import {createCard} from '../engine/cards.ts';

// Every generated deck gets a new number, so card ids never repeat between
// rounds or games.
let decksGenerated = 0;

const generateDeck = (numDecks) => {
    var cards = [];
    let deckNo = ++decksGenerated;
    for (let suitcount = 1; suitcount<=13; suitcount++) {
        for (let cardcount = 1; cardcount<=numDecks; cardcount++){
            for (let suit of ["C", "D", "H", "S"]) {
                cards.push(createCard(suitcount, suit, suitcount + suit + "-" + deckNo + "-" + cardcount));
            }
        }
    }
    shuffle(cards)
    return cards;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1)); 
        [array[i], array[j]] = [array[j], array[i]];
    }
}


const deal = (deck, numPlayers) => {
    let players = [];

    for (let i = 0; i<numPlayers;i++){
        players[i] = [];
        for (let j = 0; j < 12; j++){
            players[i].push(deck[0]);
            deck.shift(0);
        }
    }

    return players;
  
}

const deckFunctions = {
    deal,
    shuffle,
    generateDeck,
    createCard
}

export {createCard};

export default deckFunctions;