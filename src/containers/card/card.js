import React from 'react';
import {ENV_VAR} from '../../store/constants.js';
import './card.css';


var Card = function (props) {
    var cardClass;
    var wrapClass;
    let draggable = false;
    let onDrop = null;
    if (props.inHand) {
        draggable = true;
        onDrop = (event) => {
            props.handDragOnDrop(event.dataTransfer.getData("text"), props.cardNum);
        }
    }
    (props.cardSelected) ? cardClass = "card card-selected" : cardClass = "card";
    (props.cardSelected) ? wrapClass = "card-wrapper wrapper-selected" : wrapClass = "card-wrapper";
    return(
        <div className = {wrapClass} style = {{zIndex : props.zIndex}}>
            <img 
                className = {cardClass}
                src={ ENV_VAR.IMG_DIR + "/cards/" + props.cardName + ".png"}
                onClick = {(event) => props.handClickHandler(event, props.cardNum)}
                alt = { ENV_VAR.IMG_DIR + "/cards/empty-discard.png"}
                draggable = {draggable}
                onDragStart = {(event) => {event.dataTransfer.setData("text", props.cardNum)}}
                onDragOver = {(event) => {event.preventDefault()}}
                onDrop = {onDrop}
            ></img>
        </div>
    );
}

export default Card;