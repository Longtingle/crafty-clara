import {AI_CARD_SELECT, SET, RUN} from '../store/constants.js';
import handFunctions, {scoreHand, checkSetrun} from './hand-functions.js';
import params from './params.js';
import _ from 'lodash';

//exported functions
const AIFunctions = {

    selectDraw : (hand, requirement, discard) => { //done
        
        let handResult = scoreHand (hand, requirement);
        let adjustedHand = [...hand];
        adjustedHand.push(discard);
        let discardResult = scoreHand(adjustedHand, requirement)
        return (discardResult.score > handResult.score + 5) ? AI_CARD_SELECT.SELECT_DISCARD : AI_CARD_SELECT.SELECT_DECK;
    },


    selectDiscard : (pHand, requirement, isDown) => {        //done   
        
        let hand = _.cloneDeep(pHand);

        if (isDown === true) {
            //if the AI is down already, just return the card with the highest value.
            hand.sort((a, b)=> b.value-a.value);
            return hand[0].index;
        } 

        let handResult = scoreHand(hand, requirement);

        if (handResult.usefulCards.length !== hand.length) {

            // we have cards that aren't useful, return the highest.
            handResult.usefulCards.sort((a,b) => b.value-a.value);    
            handResult.usefulCards.forEach((card)=> {
                hand.splice(card.index, 1);
            });

            hand.sort((a, b)=> b.value-a.value);
        
            return hand[0].index;
        }

        // all cards are useful, throw away highest card not in best hand
        let bestCards = [];
        handResult.bestHand.forEach((setrun) => {
            bestCards.push(...setrun.cards);
        })
        bestCards.sort((a, b) => b.value - a.value);    
        bestCards.forEach((card) => {
            hand.splice(card.index, 1);
        });
        
        hand.sort((a, b)=> b.value - a.value);
        
        return hand[0].index;
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
        score.bestHand.forEach((setrun, index) => {
            table.push({type : setrun.type, cards : setrun.cards, addons : setrun.addons})
            setrun.cards.forEach(card => {
                usedCards.push(card.index);
            })
        })
        usedCards.sort((a, b) => b - a);
        let newHand = [...hand];
        usedCards.forEach((cardNum) => {
            newHand.splice(cardNum, 1);
        })
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
            OOTRequests.forEach((req, index) => {  
                if (req.index === check) {
                    if (winner === null) {
                        winner = {
                            winnerType : req.type,
                            index : req.index
                        };
                    }
                }
            }); 
            (check === params.numberOfPlayers - 1) ? check = 0 : check ++
        }
        return winner ;
        
        
    },

    AIHandBuild : (hand, AITables, playerTable) => {

        // needs re-write with build options going into the setrun
        let result = null;
        AITables.forEach((AI, AIIndex) => {
            AI.table.forEach((setrun, setrunIndex) => {
                hand.forEach((card, cardIndex) => {
                    let newCards = _.clone(setrun.cards);
                    newCards.push(card);
                    let setrunCheck = handFunctions.checkSetrun(newCards, setrun.type);
                    if (setrunCheck === true) { 
                        let newHand = [...hand];
                        newHand.splice(cardIndex, 1);
                        result = {
                            result : true,
                            newSetrun : newCards,
                            newHand,
                            cardIndex,
                            playerType : "AI",
                            setrunIndex,
                            AIIndex
                        }
                        return;
                        
                    }
                })
            })
        });

        playerTable.forEach((setrun, setrunIndex) => {
            hand.forEach((card, cardIndex) => {
                let newCards = _.clone(setrun.cards);
                newCards.push(card);
                let setrunCheck = handFunctions.checkSetrun(newCards, setrun.type);
                if (setrunCheck === true) { 
                    let newHand = [...hand];
                    newHand.splice(cardIndex, 1);
                    result = {
                        result : true,
                        newSetrun : newCards,
                        newHand,
                        cardIndex,
                        playerType : "player",
                        setrunIndex,
                        AIIndex : null
                    }
                    return;
                }
            })
        })
        if (result === null) return {result : false};
        return result;
    }
}


export default AIFunctions;