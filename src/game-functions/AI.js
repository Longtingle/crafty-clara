import {CARD_SELECT} from '../store/constants.js';

class AI {

    constructor(hand){
        this.hand = hand;
        this.isDown = false;
        this.table = [];
    }

    //Methods

    selectDraw = (discard) => {
        return CARD_SELECT.SELECT_DECK;
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
}

export default AI;
