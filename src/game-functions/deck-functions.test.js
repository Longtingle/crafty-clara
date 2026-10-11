import deckFunctions, {createCard} from './deck-functions.js';

describe('createCard', () => {
    it('builds a plain card with a display string', () => {
        expect(createCard(10, 'H')).toEqual({value : 10, suit : 'H', displayString : '10H'});
    });

    it('marks aces with their colour', () => {
        expect(createCard(1, 'D').ace).toEqual({value : 1, suit : 'D', colour : 'red'});
        expect(createCard(1, 'S').ace).toEqual({value : 1, suit : 'S', colour : 'black'});
    });
});

describe('generateDeck', () => {
    it('contains every card once per deck', () => {
        const deck = deckFunctions.generateDeck(2);
        expect(deck).toHaveLength(104);
        const counts = {};
        deck.forEach(card => {
            counts[card.displayString] = (counts[card.displayString] || 0) + 1;
        });
        expect(Object.keys(counts)).toHaveLength(52);
        Object.values(counts).forEach(count => expect(count).toBe(2));
    });

    it('gives every card an id that is unique across decks', () => {
        const ids = [...deckFunctions.generateDeck(2), ...deckFunctions.generateDeck(2)].map(card => card.id);
        expect(new Set(ids).size).toBe(208);
    });
});

describe('deal', () => {
    it('deals 12 cards to each player from the top of the deck', () => {
        const deck = deckFunctions.generateDeck(2);
        const top = deck.slice(0, 12);
        const hands = deckFunctions.deal(deck, 4);
        expect(hands).toHaveLength(4);
        hands.forEach(hand => expect(hand).toHaveLength(12));
        expect(hands[0]).toEqual(top);
        expect(deck).toHaveLength(104 - 48);
    });
});
