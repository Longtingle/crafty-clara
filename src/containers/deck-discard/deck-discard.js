import React from 'react';
import {ENV_VAR} from '../../store/constants.js';
import './deck-discard.css';

const Deck = function (props) {

    let output = null;
    output = (
        
            <div className = "deck-discard-flex">
                <img 
                    src = {ENV_VAR.IMG_DIR + "/cards/back.png"}
                    className = "deck-image"
                    onClick = {props.deckClickHandler}
                ></img>
                <img 
                    src = {ENV_VAR.IMG_DIR + "/cards/" + props.discard + ".png"}
                    className = "discard-image"
                    onClick = {props.discardClickHandler}
                ></img>
            </div>
        
        
    );


    return (
        <div className = "deck-discard-container">
            {output}
        </div>
        
    );
}

export default Deck;