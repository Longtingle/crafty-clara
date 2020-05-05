import {AI_CARD_SELECT} from '../store/constants.js';
import {scoreHand} from './hand-functions.js';
import {getValue, getSuit} from '../game-functions/deck-functions.js';
import params from './params.js';
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


    selectDiscard : (hand, requirement) => {       
        let splitHand = hand.map((card, index) => {
            return {
                value : getValue (card),
                suit : getSuit (card),
                index
            }
        });
        
        let handResult = scoreHand(hand, requirement);
        if (handResult.usefulCards.length === hand.length) {
            //all the cards in the hand are useful and we need to pick the least useful useful card.
            
            //TODO
        }

        handResult.usefulCards.sort((a,b) => b-a);    
        handResult.usefulCards.forEach(index=> {
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
        
        //TODO
        return false;
        //return true;
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
        
        
    }
}


//private functions

//const 


export default AIFunctions;