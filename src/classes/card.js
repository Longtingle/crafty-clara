

class Card {
    #value; #suit; #index;

    constructor(card, index) {
        //accepts "2C" for example
        this.#suit = (card.length === 3) ? card.substring(2, 3) : card.substring(1, 2);
        this.#value = (card.length === 3) ? card.substring(0, 2) : card.substring (0, 1);
        this.#index = index;
    }

    get suit() {
        return this.#suit;
    }

    get value() {
        return this.#value;
    }

    get index() {
        return this.#index;
    }

    get string() {
        return this.#value + this.#suit;
    }

    set index(newIndex) { 
        this.#index = newIndex;
    }
}


myCard = new Card("13C", 0);

console.log(myCard.string);

module.exports(Card);