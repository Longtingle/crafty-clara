import React from 'react';
import OpponentSetrun from '../opponent-setrun/opponent-setrun.js';

import './opponent-header.css';
import { findRenderedComponentWithType } from 'react-dom/test-utils';

const OpponentHeader = (props) => {
    
    let name = props.name;
    let nameStyle = {};


    if (props.inPlay) {
        name = "> " + props.name + " <";    
        nameStyle = {fontWeight : "bold", color : "white"};
    };
    let tableOutput = null;
    
    let message = "";

    if (props.message.timestamp !== null) {
        if (props.message.timestamp > Date.now() - 1500) {
            message = props.message.text;
        }
    }

    if (props.isDown) {
           tableOutput = props.table.map((setrun, index) => {
            let key = "OpponentSetrun"+index;
            return(
                <OpponentSetrun 
                    playerAddCardToTable = {props.playerAddCardToTable}
                    setrunIndex = {index}
                    AIIndex = {props.index}
                    setrun = {setrun}
                    key = {key} 
                />
            )
        })
    }

    return (

          <div className = "opponent-container"> 
                <div className = "opponent-header-container">
                    <div className = "opponent-header-text">
                        <p style = {nameStyle}>{name}</p>
                        <div className = "ai-message"> {message}</div>
                    </div>
                </div>
                <div className = "opponent-table-container"> 
                    <div className = "opponent-table-flex">
                        {tableOutput}
                    </div>
                </div>
          </div>  
    )

}

export default OpponentHeader;