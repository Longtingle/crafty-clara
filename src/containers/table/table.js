import React from 'react';
import Hand from '../hand/hand.js';
import Deck from '../deck-discard/deck-discard.js';
import PlayerTable from '../player-table/player-table.js';
import OpponentArea from '../opponent-area/opponent-area.js';
import './table.css';


const testHand = [
    {type : "set", cards : ["2C", "2H", "2D"]},
    {type : "run", cards : ["4S", "5S", "6S", "7S"]},
    {type : "run", cards : ["1H", "2H", "3H", "4H", "5H", "6H", "7H", "8H", "9H", "10H", "11H", "12H", "13H"]}
]

var Table = function (props) {
    return(
        <div className = 'table'>
            <OpponentArea  />
            <PlayerTable setRuns = {testHand}/>
            <Deck 
                deck = {props.state.deck}
                discard = {props.state.discard[0]}
                deckClickHandler = {props.deckClickHandler}
                discardClickHandler = {props.discardClickHandler}
            />
            <Hand 
                hand = {props.state.player.hand}
                cardSelected = {props.state.player.cardSelected}
                handClickHandler = {props.handClickHandler}
            />
        </div>
    );
}

export default Table;