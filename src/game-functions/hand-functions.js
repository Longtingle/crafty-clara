import _ from 'lodash';
import {SET, RUN} from '../store/constants.js';
import {createCard} from './deck-functions.js';
import {SUIT_SYMBOL, rankName} from './card-names.js';

const SUITS = ["C", "D", "H", "S"];

// Red aces are wild. When one is used in a setrun its value and suit are set
// to the card it stands in for, and card.ace keeps what it really is.
const isRedAce = (card) => card.ace !== undefined && card.ace.colour === "red";

const asWild = (ace, value, suit) => ({...ace, value, suit});

const scoreHand = (pHand, requirement) => { //done

    if (requirement.S === 0 && requirement.R === 0){
        throw new Error("requirement should include at least one set or run");
    }
    let hand = _.cloneDeep(pHand);
    addIndices(hand);
    let redAces = removeRedAces(hand);
    let output = {
        score : 0,
        readyToGoDown : false,
        bestHand : [],
        usefulCards : []
    }

    let usedIndices = new Set();

    if (requirement.R > 0) {
        let runs = getRuns(hand).runs.slice(0, requirement.R);
        runs.forEach(run => run.cards.forEach(card => usedIndices.add(card.index)));

        runs.forEach(run => {
            //can we use a red ace to complete this run?
            if (!run.complete && redAces.length !== 0) {
                let first = run.cards[0].value;
                let last = run.cards[run.cards.length - 1].value;
                if (run.cards.length === 3) {
                    let aceValue = (first === 1) ? last + 1 : first - 1;
                    run.cards.push(asWild(redAces.shift(), aceValue, run.cards[0].suit));
                    run.complete = true;
                    run.score = run.score + 20;
                } else {
                    // a card two away from either end can join the run with an ace in the gap
                    let gapCard = run.potentialCards.find(card =>
                        (card.value === last + 2 || card.value === first - 2) && !usedIndices.has(card.index));
                    if (gapCard) {
                        let aceValue = (gapCard.value === last + 2) ? gapCard.value - 1 : gapCard.value + 1;
                        run.cards.push(asWild(redAces.shift(), aceValue, run.cards[0].suit));
                        run.cards.push(gapCard);
                        run.potentialCards = run.potentialCards.filter(card => card !== gapCard);
                        usedIndices.add(gapCard.index);
                        run.complete = true;
                        run.score = run.score + 40 - 5;
                    }
                }
            }
            output.bestHand.push(run);
            output.score = output.score + run.score;
            output.usefulCards.push(...run.cards, ...run.potentialCards);
        });
    }

    if (requirement.S > 0) {
        let setHand = hand.filter(card => !usedIndices.has(card.index));
        let sets = getSets(setHand).sets.slice(0, requirement.S);

        sets.forEach(set => {
            //can we use a red ace to complete this set?
            if (!set.complete && redAces.length !== 0 && set.cards.length === 2) {
                let ace = redAces.shift();
                set.cards.push(asWild(ace, set.cards[0].value, ace.ace.suit));
                set.complete = true;
                set.score = set.score + 20;
            }
            output.bestHand.push(set);
            output.score = output.score + set.score;
            output.usefulCards.push(...set.cards);
        });
    }

    output.usefulCards = [...new Set(output.usefulCards)];

    //are we ready to go down? we need the right number of setruns, all complete.
    output.readyToGoDown = output.bestHand.length === requirement.R + requirement.S &&
        output.bestHand.every(setrun => setrun.complete);

    if (output.readyToGoDown) {
        //add possible add-on cards
        output.bestHand.forEach(setrun => {
            insertBuildOptions(setrun);
        })
    }

    return output;
}

const insertBuildOptions = (setrun) => { //done
    let addons = [];
    // a run's high end can go past the king to an ace (value 14)
    const addon = (value, suit) => createCard(value === 14 ? 1 : value, suit);
    if (setrun.type === SET) {
        //red ace always valid on a set.
        addons.push(createCard(setrun.cards[0].value, "H"));
        addons.push(createCard(setrun.cards[0].value, "D"));
        addons.push(createCard(setrun.cards[0].value, "C"));
        addons.push(createCard(setrun.cards[0].value, "S"));

    } else if (setrun.type === RUN) {
        let first = setrun.cards[0];
        let last = setrun.cards[setrun.cards.length - 1];
        if (first.value !== 1) addons.push(addon(first.value - 1, first.suit));
        if (last.value !== 14) addons.push(addon(last.value + 1, first.suit));
        setrun.cards.forEach((card) => {
            //the card a red ace stands in for can replace it
            if (isRedAce(card) && !(card.ace.value === card.value && card.ace.suit === card.suit)) {
                addons.push(addon(card.value, card.suit));
            }
        })
    }
    setrun.addons = addons;
}

const sortHand = (hand, param) => { //done
    //Sort for sets.
    let sortArray = _.cloneDeep(hand);
    if (param === SET) {
        return sortArray.sort((a, b) => {
            if (a.value < b.value) {
                return -1;
            }else {
                return 1;
            }
        });
    }
    if (param === RUN) {
        return sortArray.sort((a, b) => {
            if (a.suit < b.suit) return - 1;
            if (b.suit < a.suit) return 1;
            if (a.value < b.value) return - 1;
            if (b.value < a.value) return 1;
            return 0;
        });
    }
}

const makeRun = (cards) => ({
    cards,
    complete : cards.length >= 4,
    score : cards.length * 20,
    type : RUN
});

// Finds every run of two or more consecutive cards in each suit, best first.
// Red aces should be removed from the hand before calling this.
const getRuns = (hand) => { //done
    let runs = [];

    SUITS.forEach(suit => {
        let suited = sortHand(hand.filter(card => card.suit === suit), RUN);

        // an ace can sit above a king instead of below a two
        let hasKing = suited.some(card => card.value === 13);
        let hasTwo = suited.some(card => card.value === 2);
        if (suited.length > 0 && suited[0].value === 1 && hasKing && !hasTwo) {
            suited.push({...suited.shift(), value : 14});
        }

        let suitRuns = [];
        let run = [];
        const closeRun = () => {
            if (run.length >= 2) suitRuns.push(makeRun(run));
        };
        suited.forEach(card => {
            let last = run[run.length - 1];
            if (last === undefined || card.value === last.value + 1) {
                run.push(card);
            } else if (card.value !== last.value) {
                closeRun();
                run = [card];
            }
            // a duplicate of the previous card neither extends nor breaks the run
        });
        closeRun();

        suitRuns.forEach(run => {
            let first = run.cards[0].value;
            let last = run.cards[run.cards.length - 1].value;
            let runValues = run.cards.map(card => card.value);
            run.potentialCards = suited.filter(card =>
                !runValues.includes(card.value) &&
                (Math.abs(card.value - first) < 4 || Math.abs(card.value - last) < 4));
            run.score = run.score + (run.potentialCards.length * 5);
        });
        runs.push(...suitRuns);
    });

    runs.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return b.cards[0].value - a.cards[0].value;
    });

    return {
        numFullRuns : runs.filter(run => run.complete).length,
        runs : runs
    };
}

const removeRedAces = (hand) => { //done
    let redAces = [];
    let redAcesIndex = [];


    hand.forEach((card, index) => {
        if (!card.ace) return;
        if (card.ace.colour === "red") {
            redAces.push(card);
            redAcesIndex.push(index);
        }
    })

    redAcesIndex.sort((a, b) => b - a);
    redAcesIndex.forEach((cardNum) => {
        hand.splice(cardNum, 1);
    })

    return redAces;
}

const addIndices = (hand) => { //done
    hand.forEach((card, index) => {
        card.index = index;
    });
}

// Finds every pair or better of the same value, best first.
// Red aces should be removed from the hand before calling this.
const getSets = (hand) => { //done
    let sets = Object.values(_.groupBy(hand, card => card.value))
        .filter(cards => cards.length >= 2)
        .map(cards => ({
            cards,
            complete : cards.length >= 3,
            score : cards.length * 20,
            type : SET
        }));

    sets.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return b.cards[0].value - a.cards[0].value;
    });

    return {
        numFullSets : sets.filter(set => set.complete).length,
        sets : sets
    };
}

const checkSet = (naturals, wilds) => {
    if (naturals.length < 2 || naturals.length + wilds.length < 3) return null;
    let value = naturals[0].value;
    if (naturals.some(card => card.value !== value)) return null;
    return [...naturals, ...wilds.map(ace => asWild(ace, value, ace.ace.suit))];
}

// Lays out a run from naturals with fixed values, filling gaps with wilds and
// putting any spare wilds below the run first, then above it.
const layOutRun = (naturals, wilds) => {
    let sorted = _.sortBy(naturals, card => card.value);
    let values = sorted.map(card => card.value);
    if (new Set(values).size !== values.length) return null;

    let min = values[0];
    let max = values[values.length - 1];
    let gaps = (max - min + 1) - values.length;
    if (gaps > wilds.length) return null;

    let spare = wilds.length - gaps;
    let start = Math.max(1, min - spare);
    let end = start + naturals.length + wilds.length - 1;
    if (end > 14) return null;

    let suit = sorted[0].suit;
    let remainingWilds = [...wilds];
    let cards = [];
    for (let value = start; value <= end; value++) {
        let natural = sorted.find(card => card.value === value);
        cards.push(natural || asWild(remainingWilds.shift(), value, suit));
    }
    return cards;
}

const checkRun = (naturals, wilds) => {
    if (naturals.length < 3 || naturals.length + wilds.length < 4) return null;
    let suit = naturals[0].suit;
    if (naturals.some(card => card.suit !== suit)) return null;

    // an ace can be low (below a two) or high (above a king)
    let aces = naturals.filter(card => card.value === 1);
    let layouts = [naturals];
    if (aces.length > 0) {
        let highAce = aces[aces.length - 1];
        layouts.push(naturals.map(card => card === highAce ? {...card, value : 14} : card));
    }
    for (let layout of layouts) {
        let cards = layOutRun(layout, wilds);
        if (cards) return cards;
    }
    return null;
}

// Checks whether a group of cards makes a valid set (3+ of a value) or run
// (4+ in a row of one suit). Red aces are wild but can't outnumber the
// natural cards. Returns the setrun in order, with wild values assigned.
const checkSetrun = (cards, type) => {
    let wilds = cards.filter(isRedAce);
    let naturals = cards.filter(card => !isRedAce(card));
    if (wilds.length > naturals.length) return {valid : false};

    let ordered = (type === SET) ? checkSet(naturals, wilds) : checkRun(naturals, wilds);
    if (ordered === null) return {valid : false};
    return {
        valid : true,
        setrun : {type, cards : ordered}
    };
}

// The values missing from a run's natural cards, e.g. [5] for 3 4 6 7. With
// an ace, whichever of ace-low or ace-high leaves fewer gaps is used.
const runGaps = (naturals) => {
    let layouts = [naturals.map(card => card.value)];
    if (naturals.some(card => card.value === 1)) {
        layouts.push(naturals.map(card => card.value === 1 ? 14 : card.value));
    }
    let gapLists = layouts.map(values => {
        let gaps = [];
        for (let value = Math.min(...values); value <= Math.max(...values); value++) {
            if (!values.includes(value)) gaps.push(value);
        }
        return gaps;
    });
    return _.minBy(gapLists, gaps => gaps.length);
}

// Says why cards don't make a valid set or run yet, or returns null when
// checkSetrun would accept them. The go-down dialog shows this to the player.
const explainSetrun = (cards, type) => {
    let wilds = cards.filter(isRedAce);
    let naturals = cards.filter(card => !isRedAce(card));

    if (type === SET) {
        if (cards.length === 0) return "Pick 3 or more cards of the same value.";
        if (naturals.some(card => card.value !== naturals[0].value)) return "Every card in a set must have the same value.";
        if (wilds.length > naturals.length) return "Wild aces can't outnumber natural cards.";
        if (cards.length < 3) return "A set needs at least 3 cards. Add " + (3 - cards.length) + " more.";
        return null;
    }

    if (cards.length === 0) return "Pick 4 or more cards in a row, all the same suit.";
    if (naturals.some(card => card.suit !== naturals[0].suit)) return "Every card in a run must be the same suit.";
    if (wilds.length > naturals.length) return "Wild aces can't outnumber natural cards.";
    if (new Set(naturals.map(card => card.value)).size !== naturals.length) return "A run can't have two cards of the same value.";

    let gaps = (naturals.length > 1) ? runGaps(naturals) : [];
    if (gaps.length > wilds.length) {
        let missing = gaps.map(value => rankName(value) + SUIT_SYMBOL[naturals[0].suit]);
        return (missing.length === 1)
            ? "There's a gap. Add the " + missing[0] + " or a wild ace."
            : "There are gaps. Add the " + missing.join(" and ") + ", or wild aces in their place.";
    }
    if (cards.length < 4) return "A run needs at least 4 cards. Add " + (4 - cards.length) + " more.";
    if (naturals.length < 3) return "A run needs at least 3 natural cards.";
    if (checkRun(naturals, wilds)) return null;
    return "These cards don't make a run.";
}

// Tries to add one card to a setrun already on the table. A natural card
// matching a red ace's stand-in value replaces it and the ace is returned to
// the hand; otherwise the card has to extend the setrun.
const addToSetrun = (setrun, card) => {
    let cards = setrun.cards;
    let result = (newCards) => ({valid : true, setrun : {...setrun, cards : newCards}, returnedAce : null});

    if (isRedAce(card)) {
        let wildCount = cards.filter(isRedAce).length + 1;
        if (wildCount > cards.length + 1 - wildCount) return {valid : false};
        if (setrun.type === SET) return result([...cards, asWild(card, cards[0].value, card.ace.suit)]);
        let first = cards[0];
        let last = cards[cards.length - 1];
        if (first.value > 1) return result([asWild(card, first.value - 1, first.suit), ...cards]);
        if (last.value < 14) return result([...cards, asWild(card, last.value + 1, first.suit)]);
        return {valid : false};
    }

    let replaced = cards.find(wild => isRedAce(wild) &&
        wild.value === card.value && (setrun.type === SET || wild.suit === card.suit));
    if (replaced) {
        return {
            ...result(cards.map(c => c === replaced ? card : c)),
            returnedAce : createCard(1, replaced.ace.suit)
        };
    }

    if (setrun.type === SET) {
        return (card.value === cards[0].value) ? result([...cards, card]) : {valid : false};
    }

    let first = cards[0];
    let last = cards[cards.length - 1];
    if (card.suit !== first.suit) return {valid : false};
    if (card.value === first.value - 1) return result([card, ...cards]);
    if (card.value === last.value + 1) return result([...cards, card]);
    if (card.value === 1 && last.value === 13) return result([...cards, {...card, value : 14}]);
    return {valid : false};
}

const getPoints = (hand) => { //done
    let score = 0;

    hand.forEach((card) => {
        if (card.value === 1) {
            score = score + 25;
        } else if (card.value > 9) {
            score = score + 10;
        } else {
            score = score + card.value;
        }
    });
    return score;
}

const handFunctions = {
    getRuns,
    getSets,
    scoreHand,
    sortHand,
    checkSetrun,
    explainSetrun,
    addToSetrun,
    getPoints,
    insertBuildOptions
}

export {
    getRuns,
    getSets,
    scoreHand,
    sortHand,
    checkSetrun,
    explainSetrun,
    addToSetrun,
    getPoints,
    insertBuildOptions
}

export default handFunctions;
