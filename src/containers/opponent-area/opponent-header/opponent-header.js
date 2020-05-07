import React from 'react';
import OpponentSetrun from '../opponent-setrun/opponent-setrun.js';

import './opponent-header.css';
import { findRenderedComponentWithType } from 'react-dom/test-utils';

const OpponentHeader = (props) => {
    //props needed.
    //AI Cards on table
    //AIInPlay
    //Opponent name
    //
    let name = props.name;
    let nameStyle = {};

    if (props.inPlay) {
        name = "> " + props.name + " <";    
        nameStyle = {fontWeight : "bold", color : "white"};
    };
    let tableOutput = null;
    if (true) { //GET RID OF THIS
    //if (props.isDown) {
        tableOutput = props.testHand.map((setrun, index) => { // GET RID OF THIS
        //let tableOutput = props.table.map((setrun, index) => {
            let key = "OpponentSetrun"+index;
            return(
                <OpponentSetrun 
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