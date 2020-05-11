import React from 'react';

import './round-end.css';

const RoundEnd = (props) => {
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
    props.AIPlayers.forEach(player, index => {
        AIRows.push([]);
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
    return (
        <div className = "round-end-container">
            <div className = "scoreboard-container">
                
            </div>
        </div>
    )
}

export default RoundEnd;