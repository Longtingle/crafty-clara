import React from 'react';
import './hand.css';
import Card from '../card/card.js';

var Hand = function (props) {
    let hand = null;
    if (props.hand.length != 0) {
        hand = props.hand.map((card, index) => {
            return (
                <Card 
                    cardName = {card}
                    key = {index}
                    cardNum = {index}
                    handClickHandler = {props.handClickHandler}
                />
            )
        })
    }
    return (
        <div className = "hand">
            {hand}
        </div>
    );
}

export default Hand;