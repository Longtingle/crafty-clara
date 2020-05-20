
const generateDeck = (numDecks) => {
    var cards = [];
    for (let suitcount = 1; suitcount<=13; suitcount++) {
        for (let cardcount = 1; cardcount<=numDecks; cardcount++){
            cards.push(createCard(suitcount, "C"));
            cards.push(createCard(suitcount, "D"));
            cards.push(createCard(suitcount, "H"));
            cards.push(createCard(suitcount, "S"));
        }
    }
    shuffle(cards)
    return cards;
}

const createCard = (value, suit) => {
    let card = {
        value,
        suit,
        displayString : value + suit,
    }
    if (value === 1) {
        let colour = (suit === "C" || suit === "S") ? "black" : "red";
        card.ace = {value, suit, color}
    }
    return card;
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
}

export default deckFunctions;