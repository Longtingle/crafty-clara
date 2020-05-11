import React from 'react'
import Card from '../../card/card.js';
import './opponent-setrun.css';

const OpponentSetrun = (props) => {
    let output = props.setrun.cards.map((card, index) => {
        let key = "opponentCard"+index;
        return (
            <Card 
                handClickHandler = {(event) => props.playerAddCardToTable(event, "AI", props.setrunIndex, props.AIIndex)}
                cardName = {card}
                key = {key} 
            />
        )
    });

    return (
        <div className = "opponent-setrun-container">
            <div className = "opponent-setrun-flex">
                {output}
            </div>
        </div>
    )
}

export default OpponentSetrun;