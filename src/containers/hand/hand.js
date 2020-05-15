import React from 'react';
import './hand.css';
import Card from '../card/card.js';

var Hand = function (props) {
    let hand = null;
    let selected = null;
    if (props.hand.length != 0) {
        hand = props.hand.map((card, index) => {
            (props.cardSelected === index) ? selected = true : selected = false;
            return (
                <Card 
                    cardName = {card}
                    key = {index}
                    cardNum = {index}
                    cardSelected = {selected}
                    handClickHandler = {props.handClickHandler}
                    inHand = {true}
                    handDragOnDrop = {props.handDragOnDrop}
                />
            )
        })
    }
    return (
        <div className = "player-area">
            <div className = "player-buttons-container">
                <div className = "player-buttons-flex">
                    <div className = "button" onClick = {() => props.playerHandSortRuns()}>
                            <p>Sort for Runs</p>
                    </div>
                    <div className = "button" onClick = {() => props.playerHandSortSets()}>
                            <p>Sort for Sets</p>
                    </div>
                    <div className = "button" onClick = {() => props.goDownClickHandler()}>
                            <p>Go Down</p>  
                    </div>
                </div>
            </div>
            <div className = "player-hand-container">
                <div className = "hand">
                    {hand}
                </div>
            </div>
        </div>
    );
}

export default Hand;