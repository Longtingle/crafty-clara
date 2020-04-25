import {AI_CARD_SELECT} from '../store/constants.js';

class AI {

    constructor(hand){
        this.hand = hand;
        this.isDown = false;
        this.table = [];
    }

    //Methods

    selectDraw = (discard) => {
        return AI_CARD_SELECT.SELECT_DECK;
    }

    addCard = (card) => {
        this.hand.push(card);
    }

    selectDiscard = (requirement) => {
        this.hand.shift();
    }

    drawOOT = (card) => {
        return false;
        return true;
    }

    canGoDown = (requirement) => {
        return false;
        return true;
    }

    playTurn = () => {
        //after drawing a card and waiting for a some time for the player to see the discard
        //this method should be triggered to determine : 
        //1. Can the computer go down?
        //2. Does the computer want to go down?
        //3. If not, discard
        //4. return an object explaining what was done.
    }
}

export default AI;
