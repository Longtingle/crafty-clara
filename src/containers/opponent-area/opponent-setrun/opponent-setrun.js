import React from 'react'
import Card from '../../card/card.js';
import './opponent-setrun.css';

const OpponentSetrun = (props) => {
    console.log("props.setrun from OpponentSetrun");    
    console.log(props.setrun);
    let output = props.setrun.cards.map((card, index) => {
        let key = "opponentCard"+index;
        return (
            <Card cardName = {card}/>
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