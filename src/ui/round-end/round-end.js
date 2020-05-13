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
    for (let i = counter; i < 7; i++) {
        playerRow.push("-");
    }
    playerRow.push(props.player.points.total);
    props.AIPlayers.forEach((player, index) => {
        AIRows[index] = [];
        AIRows[index].push(player.name);
        player.points.points.forEach(points => {
            AIRows[index].push(points);
        });
        for (let i = counter; i < 7; i++) {
            AIRows[index].push("-");
        }
        AIRows[index].push(player.points.total);
    })

    console.log(AIRows);
    console.log(playerRow);
    console.log(headerRow);
    let tableHeader = headerRow.map((header,index) => {
        let key = "header-" + index;
        return (
            <th key = {key}>{header}</th>
        )
    });
    let tablePlayerRow = playerRow.map((data, index) => {
        let key = "player-data-" + index;
        return(
            <td key = {key}>{data}</td>
        )
    });

    let tableAI = AIRows.map((AIRow, AIIndex) => {
        let rowKey = "AI-row-" + AIIndex;
        console.log(AIRow);
        let tableAIRow = AIRow.map((data, index) => {
            let key = "AI-data-" + AIIndex + "-" + index;
            return (
                <td key = {key}> {data}</td>
            )
        })
        return (
            <tr key={rowKey}>
                {tableAIRow}
            </tr>
        )
    })


    
    let output = null;
    if (props.endOfRound === true) {
        console.log("generating output");
        output = (
            <div className = "round-end-container">
                <div className = "round-end-header">End of Round {props.game.round + 1}</div>
                <div className = "scoreboard-container">
                    <table>
                        <thead>
                            <tr>
                                {tableHeader}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                {tablePlayerRow}
                            </tr>
                            {tableAI}
                        </tbody>
                    </table>
                </div>
                <div className = "round-end-buttons-container">
                    <div className = "round-end-button" onClick = {props.nextRoundHandler}>
                        Start Next Round
                    </div>
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