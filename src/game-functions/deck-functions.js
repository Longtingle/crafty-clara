
const generateDeck = (numDecks) => {
    var cards = [];
    for (let suitcount = 1; suitcount<=13; suitcount++) {
        for (let cardcount = 1; cardcount<=numDecks; cardcount++){
            cards.push(suitcount + "C");
            cards.push(suitcount + "D");
            cards.push(suitcount + "H");
            cards.push(suitcount + "S");
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
    console.log(deck);
    console.log(players);
    
    return players;
  
}

const getSuit = card => {
    return card.substring(card.length -1);
}

const getValue = card => {
     return (card.length === 3) ? card.substring(0, 2) :  card.substring(0, 1);
}

const deckFunctions = {
    deal,
    shuffle,
    generateDeck,
    getSuit,
    getValue
}

export {getSuit, getValue};

export default deckFunctions;