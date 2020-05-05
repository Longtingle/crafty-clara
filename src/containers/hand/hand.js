import React from 'react';
import './hand.css';
import Card from '../card/card.js';

var Hand = function (props) {
    let hand = null;
    let selected = null;
    if (props.hand.length != 0) {
        hand = props.hand.map((card, index) => {
            (props.cardSelected === index) ? selected = true : selected = false;
            return (
                <Card 
                    cardName = {card}
                    key = {index}
                    cardNum = {index}
                    cardSelected = {selected}
                    handClickHandler = {props.handClickHandler}
                    
                />
            )
        })
    }
    return (
        <div className = "player-hand-container">
            <div className = "hand">
                {hand}
            </div>
        </div>
    );
}

export default Hand;