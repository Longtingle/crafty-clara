import {AI_CARD_SELECT} from '../store/constants.js';
import {scoreHand, checkSetrun, addToSetrun, insertBuildOptions} from './hand-functions.js';
import params from './params.js';
import _ from 'lodash';

const isRedAce = (card) => card.ace !== undefined && card.ace.colour === "red";

//exported functions
const AIFunctions = {

    selectDraw : (hand, requirement, discard) => { //done

        let handResult = scoreHand (hand, requirement);
        let adjustedHand = [...hand];
        adjustedHand.push(discard);
        let discardResult = scoreHand(adjustedHand, requirement)
        return (discardResult.score > handResult.score + 5) ? AI_CARD_SELECT.SELECT_DISCARD : AI_CARD_SELECT.SELECT_DECK;
    },


    // Returns the index of the card to discard: the highest card that isn't
    // useful, then the highest not in the best hand. Red aces are kept if possible.
    selectDiscard : (pHand, requirement, isDown) => {        //done

        let hand = pHand.map((card, index) => ({...card, index}));
        let candidates = hand;

        if (isDown !== true) {
            let handResult = scoreHand(pHand, requirement);
            let useful = new Set(handResult.usefulCards.map(card => card.index));
            let best = new Set(handResult.bestHand.flatMap(setrun => setrun.cards.map(card => card.index)));
            candidates = hand.filter(card => !useful.has(card.index));
            if (candidates.length === 0) candidates = hand.filter(card => !best.has(card.index));
            if (candidates.length === 0) candidates = hand;
        }

        let notWild = candidates.filter(card => !isRedAce(card));
        if (notWild.length > 0) candidates = notWild;

        return _.maxBy(candidates, card => card.value).index;
    },


    drawOOT : (hand, requirement, discard) => {  //done
        let handResult = scoreHand(hand, requirement);
        let discardHand = [...hand];
        discardHand.push(discard);

        let discardResult = scoreHand(discardHand, requirement);

        return (discardResult.score > handResult.score + 5) ? true : false;
    },


    canGoDown : (hand, requirement) => { //done

        let score = scoreHand(hand, requirement);
        if (!score.readyToGoDown) return {result : false};
        let table = [];
        let usedCards = [];
        for (let setrun of score.bestHand) {
            // scoreHand only estimates, so make sure each setrun really is valid
            let check = checkSetrun(setrun.cards.map(card => _.omit(card, 'index')), setrun.type);
            if (!check.valid) return {result : false};
            insertBuildOptions(check.setrun);
            table.push(check.setrun);
            usedCards.push(...setrun.cards.map(card => card.index));
        }
        if (new Set(usedCards).size !== usedCards.length) return {result : false};

        let newHand = hand.filter((card, index) => !usedCards.includes(index));
        return {
            result : true,
            table,
            newHand
        }
    },

    resolveOOT : (OOTRequests, AIInPlay) => { //done

        if (OOTRequests.length === 0){
            return {winnerType : "none"};
        }
        if (OOTRequests.length === 1){
            if (OOTRequests[0].type === "AI") {
                return {winnerType : "AI", index : OOTRequests[0].index}
            } else {
                return {winnerType : "player", index : params.numberOfPlayers - 1}
            }
        }
        let check;
        let winner = null;

        check = (AIInPlay === null) ? 0 : AIInPlay + 1;
        for (let i = 0; i < params.numberOfPlayers; i++) {
            OOTRequests.forEach((req) => {
                if (req.index === check) {
                    if (winner === null) {
                        winner = {
                            winnerType : req.type,
                            index : req.index
                        };
                    }
                }
            });
            check = (check === params.numberOfPlayers - 1) ? 0 : check + 1;
        }
        return winner ;


    },

    // Looks for a card in hand that can be added to any setrun on the table.
    AIHandBuild : (hand, AITables, playerTable) => {
        let tables = [
            ...AITables.map(AI => ({playerType : "AI", AIIndex : AI.index, table : AI.table})),
            {playerType : "player", AIIndex : null, table : playerTable}
        ];

        for (let {playerType, AIIndex, table} of tables) {
            for (let setrunIndex = 0; setrunIndex < table.length; setrunIndex++) {
                for (let cardIndex = 0; cardIndex < hand.length; cardIndex++) {
                    let added = addToSetrun(table[setrunIndex], hand[cardIndex]);
                    if (!added.valid) continue;
                    let newHand = [...hand];
                    newHand.splice(cardIndex, 1);
                    if (added.returnedAce) newHand.push(added.returnedAce);
                    return {
                        result : true,
                        newSetrun : added.setrun,
                        newHand,
                        cardIndex,
                        playerType,
                        setrunIndex,
                        AIIndex
                    };
                }
            }
        }
        return {result : false};
    }
}


export default AIFunctions;
