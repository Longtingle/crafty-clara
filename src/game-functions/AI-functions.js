import {AI_CARD_SELECT} from '../store/constants.js';
import handFunctions, {scoreHand, checkSetrun} from './hand-functions.js';
import {getValue, getSuit} from '../game-functions/deck-functions.js';
import params from './params.js';
import _ from 'lodash';
import { isCompositeComponent } from 'react-dom/test-utils';
//exported functions
const AIFunctions = {

    selectDraw : (hand, requirement, discard) => {
        //needs to be re-written - just selected the deck for now.
        let handResult = scoreHand (hand, requirement);
        let adjustedHand = [...hand];
        adjustedHand.push(discard);
        let discardResult = scoreHand(adjustedHand, requirement)
        return (discardResult.score > handResult.score + 5) ? AI_CARD_SELECT.SELECT_DISCARD : AI_CARD_SELECT.SELECT_DECK;
    },


    selectDiscard : (hand, requirement, isDown) => {       
        
        let splitHand = hand.map((card, index) => {
            return {
                value : getValue (card),
                suit : getSuit (card),
                index
            }
        });
        if (isDown === true) {
            //if the AI is down already, just return the card with the highest value.
            splitHand.sort((a, b)=> b.value-a.value);
            return splitHand[0].index;
        }

        let handResult = scoreHand(hand, requirement);
        console.log(handResult);
        if (handResult.usefulCards.length !== hand.length) {
            // we have cards that aren't useful, return the highest.
            handResult.usefulCards.sort((a,b) => b-a);    
            handResult.usefulCards.forEach(index=> {
                splitHand.splice(index, 1);
            });
        
            splitHand.sort((a, b)=> b.value-a.value);
        
            return splitHand[0].index;
        }

        // all cards are useful, throw away highest card not in best hand
        let bestCards = [];
        handResult.bestHand.forEach((setrun) => {
            bestCards.push([...setrun.keys]);
        })
        bestCards.sort((a,b) => b-a);    
        bestCards.forEach(index=> {
            splitHand.splice(index, 1);
        });
        
        splitHand.sort((a, b)=> b.value-a.value);
        
        return splitHand[0].index;
    },


    drawOOT : (hand, requirement, discard) => {
        //takes a hand (array of 'cards') and a card and decides whether to take that card or take from the deck.
        //needs to be re-written - never draws out of turn for now.
        
        let handResult = scoreHand(hand, requirement);
        let discardHand = [...hand];
        discardHand.push(discard);
    
        let discardResult = scoreHand(discardHand, requirement);
        
        return (discardResult.score > handResult.score + 5) ? true : false;
        //TODO - need to improve such that the rather than just looking at score, we consider if it's worth exposing what's being collected
    },


    canGoDown : (hand, requirement) => {
        let score = scoreHand(hand, requirement);
        if (!score.readyToGoDown) return {result : false};
        let table = [];
        let usedCards = [];
        score.bestHand.forEach((setrun, index) => {
            let setrunCards = [];
            setrun.keys.forEach(cardNum => {
                setrunCards.push(hand[cardNum]);
                usedCards.push(cardNum);
            });
            table.push({type : setrun.type, cards : setrunCards})
        })
        usedCards.sort((a, b) => b-a);
        console.log(usedCards);
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


    playTurn : (hand, requirement) => {
        var result = {};
        //AI has drawn card and waited for visibility of discard - decide what to do next.
        if(AIFunctions.canGoDown()){
            //some logic for going down, should be easy(relatively)
            result.goneDown = true;
            result.hand = [];
            result.table = [[],[]];
        } else { 
            //need to discard 
            result.discard = AIFunctions.selectDiscard(requirement);
            return result;
        }
    },

    resolveOOT : (OOTRequests, AIInPlay) => {
        console.log("resolve OOT - triggered");
        console.log("AIInPlay = " + AIInPlay);
        if (OOTRequests.length === 0){
            console.log("Return 1");
            return {winnerType : "none"};
        } 
        if (OOTRequests.length === 1){
            if (OOTRequests[0].type === "AI") { 
                console.log("return 2");
                return {winnerType : "AI", index : OOTRequests[0].index}
            } else {
                console.log("return 3");
                return {winnerType : "player", index : params.numberOfPlayers - 1}
            }
        }
        let check;
        let winner = null;
        
        check = (AIInPlay === null) ? 0 : AIInPlay + 1;
        console.log(check);
        for (let i = 0; i < params.numberOfPlayers; i++) {
            OOTRequests.forEach((req, index) => {  
                console.log("Checking: ");
                console.log(req);
                if (req.index === check) {
                    console.log("Triggered");
                    if (winner === null) {
                        console.log("Writing result");
                        winner = {
                            winnerType : req.type,
                            index : req.index
                        };
                    }
                }
            }); 
            (check === params.numberOfPlayers - 1) ? check = 0 : check ++
        }
        console.log("return 4");
        console.log(winner);
        return winner ;
        
        
    },

    AIHandBuild : (hand, AITables, playerTable) => {
        console.log("HAND : ");
        console.log(hand);
        console.log("AI TABLES : ");
        console.log(AITables);
        console.log("PLAYER TABLE : ");
        console.log(playerTable);

        let result = null;
        AITables.forEach((AI, AIIndex) => {
            console.log("AI : ");
            console.log(AI);
            AI.table.forEach((setrun, setrunIndex) => {
                hand.forEach((card, cardIndex) => {
                    let newCards = _.clone(setrun.cards);
                    newCards.push(card);
                    console.log("Checking: ");
                    console.log(newCards); 
                    console.log(setrun.type);
                    let setrunCheck = handFunctions.checkSetrun(newCards, setrun.type);
                    if (setrunCheck === true) { 
                        let newHand = [...hand];
                        newHand.splice(cardIndex, 1);
                        console.log("CHECK TRUE");
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
                console.log("Checking: ");
                console.log(newCards); 
                console.log(setrun.type);
                let setrunCheck = handFunctions.checkSetrun(newCards, setrun.type);
                if (setrunCheck === true) { 
                    let newHand = [...hand];
                    newHand.splice(cardIndex, 1);
                    console.log("CHECK TRUE");
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


//private functions

//const 


export default AIFunctions;