import {AI_CARD_SELECT} from '../store/constants.js';



//exported functions
const AIFunctions = {
    selectDraw : (hand, requirement, discard) => {
        //needs to be re-written - just selected the deck for now.
        return AI_CARD_SELECT.SELECT_DECK;
    },
    selectDiscard : (requirement) => {
        //needs to be re-written - just selected random card for now.
    },
    drawOOT : (hand, card) => {
        //takes a hand (array of 'cards') and a card and decides whether to take that card or take from the deck.
        //needs to be re-written - never draws out of turn for now.
        return false;
    },
    canGoDown : (hand, requirement) => {
        return false;
        return true;
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