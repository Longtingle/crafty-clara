import {AI_CARD_SELECT} from '../store/constants.js';
import scoreHand from './score-hand.js';
import {getValue, getSuit} from '../game-functions/deck-functions.js';

//exported functions
const AIFunctions = {

    selectDraw : (hand, requirement, discard) => {
        //needs to be re-written - just selected the deck for now.
        let handResult = scoreHand (hand, requirement);
        let adjustedHand = [...hand];
        adjustedHand.push(discard);
        let discardResult = scoreHand(adjustedHand, requirement)

        console.log ("Hand : ");
        console.log(handResult);
        console.log ("Hand + Discard : ");
        console.log(discardResult);

        return AI_CARD_SELECT.SELECT_DECK;
    },


    selectDiscard : (hand, requirement) => {
        
        console.log("---------------------");
        console.log("---------------------");
        console.log("Select Discard");
        console.log("---------------------");
        console.log("---------------------");
        
        let splitHand = hand.map((card, index) => {
            return {
                value : getValue (card),
                suit : getSuit (card),
                index
            }
        });
        
        let handResult = scoreHand(hand, requirement);
        handResult.usefulCards.sort((a,b) => b-a);    
        console.log(handResult.usefulCards);
        handResult.usefulCards.forEach(index=> {
            splitHand.splice(index, 1);
        });
        
        splitHand.sort((a, b)=> b.value-a.value);
        console.log(splitHand);
        
        return splitHand[0].index;
    },


    drawOOT : (hand, card) => {
        //takes a hand (array of 'cards') and a card and decides whether to take that card or take from the deck.
        //needs to be re-written - never draws out of turn for now.
        return false;
    },


    canGoDown : (hand, requirement) => {
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
    }
}


//private functions

//const 


export default AIFunctions;