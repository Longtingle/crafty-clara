import React from 'react';
import Card from '../../containers/card/card.js';

import './go-down.css';

const GoDown = (props) => {
    let output = null;
    let hand = props.hand.map((card, index) => {
        return <Card cardName = {card} />
    });

    if (props.isGoingDown) {
        output = (
            <div className = "go-down-container">
                <div className = "cancel-button" onClick = {props.cancelClickHandler}><p>X</p></div>
                <div className = "hand-container">
                    {hand}
                </div>
            </div>
        )
    }
    return (
        output
    )
}

export default GoDown;