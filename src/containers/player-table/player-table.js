import React from 'react'
import PlayerTableSetrun from './player-table-setrun/player-table-setrun.js';

import './player-table.css';

const PlayerTable = (props) => {
    
    let output = null;

    output= props.setRuns.map((setrun, index) => { 
        let keyString = "player-setrun-" + index;
        return (
            <PlayerTableSetrun setrun = {setrun} key = {keyString} />
        )
    })
    return (
        <div className = "player-table-container">
            <div className = "player-table-flex">
                {output}
            </div>
        </div>
    )
}

export default PlayerTable;