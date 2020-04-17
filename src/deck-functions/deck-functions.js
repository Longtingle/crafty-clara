
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
      let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  export default generateDeck;