import React from 'react';
import Card from '../../card/card.js';

import './player-table-setrun.css';

const playerTableSetrun = (props) => {
    let output = props.setrun.cards.map((card, index) => {
        return (
            <Card cardName = {card} key = {index}/>
        )
    })
    return (
        <div className = "setrun-container">
            <div className = "setrun-flex">
                {output}
            </div>
        </div>
    )
}

export default playerTableSetrun;