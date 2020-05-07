import React from 'react';
import OpponentHeader from './opponent-header/opponent-header.js';

import './opponent-area.css';

const OpponentArea = (props) => {
    let output = props.AI.players.map((player, index) => {
        let key = "OpponentHeader" + index;
        let inPlay = (props.AI.AIInPlay === index) ? true : false;
        console.log(player);
        return (
            <OpponentHeader 
                testHand = {props.testHand}
                name = {player.name}
                inPlay = {inPlay}
                isDown = {player.isDown}
                table = {player.table}
                key = {key}
                index = {index}
            />
        )
    })
    return (
        <div className = "opponent-area-container">
            {output}
        </div>
    )
}

export default OpponentArea;