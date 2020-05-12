import React from 'react';
import Auxhoc from '../auxhoc/auxhoc.js';

import './round-end.css';

const RoundEnd = (props) => {
    console.log(props);
    if (props.endOfRound === false) return null;
    let AIRows = [];
    let playerRow = [];
    let headerRow = [];

    headerRow.push("Player");
    for (let i = 1; i < 8 ; i++) {
        headerRow.push("Round " + i);
    }
    headerRow.push("Total");

    playerRow.push("You");
    let counter = 0;
    props.player.points.points.forEach(points => {
        playerRow.push(points);
        counter++;
    });
    for (let i = counter; i < 8; i++) {
        playerRow.push("-");
    }
    playerRow.push(props.player.points.total);
    props.AIPlayers.forEach((player, index) => {
        AIRows[index] = [];
        player.points.points.forEach(points => {
            AIRows[index].push(points);
        });
        for (let i = counter; i < 8; i++) {
            AIRows[index].push("-");
        }
        AIRows.push(player.points.total);
    })

    console.log(AIRows);
    console.log(playerRow);
    console.log(headerRow);
    
    let output = null;
    if (props.endOfRound === true) {
        let output = (
            <div className = "round-end-container">
                <div className = "scoreboard-container">
                
                </div>
            </div>
        );
    }
    return (
        <Auxhoc>
            {output}        
        </Auxhoc>
        
    )
}

export default RoundEnd;