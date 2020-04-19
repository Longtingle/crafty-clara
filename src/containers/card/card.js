import React from 'react';
import {ENV_VAR} from '../../store/constants.js';
import './card.css';

var Card = function (props) {
    return(
        <div className = 'card-wrapper' style = {{zIndex : props.zIndex}}>
            <img 
                className = 'card' 
                src={ ENV_VAR.IMG_DIR + "/cards/" + props.cardName + ".png"}
                style={{zIndex : props.zIndex}}
                cardnum = {props.cardNum}
                onClick = {props.handClickHandler}
            ></img>
        </div>
    );
}

export default Card;