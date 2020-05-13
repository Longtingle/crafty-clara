

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


class Hand {
    cards = [];
    constructor(cards) {
        //expects array eg ["2C", "3H", etc...]
        cards.forEach((card, index) => {
            this.cards.push(new Card(card, index));
        });
    }
}

myHand = new Hand(["2C", "3C", "4D"]);


console.log(myHand.cards[0].value);