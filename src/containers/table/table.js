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
            <OpponentArea  
                playerAddCardToTable = {props.playerAddCardToTable}
                AI = {props.state.AI}
                gameState = {props.state.game.gameState}
            />
            <PlayerTable 
                setRuns = {props.state.player.table}
                playerAddCardToTable = {props.playerAddCardToTable}
            />
            <Deck 
                deck = {props.state.deck}
                discard = {props.state.discard[0]}
                deckClickHandler = {props.deckClickHandler}
                discardClickHandler = {props.discardClickHandler}
                whatWasClicked = {props.whatWasClicked}
            />
            <Hand 
                playerHandSortSets = {props.playerHandSortSets}
                playerHandSortRuns = {props.playerHandSortRuns}
                goDownClickHandler = {props.goDownClickHandler}
                hand = {props.state.player.hand}
                cardSelected = {props.state.player.cardSelected}
                handClickHandler = {props.handClickHandler}
                whatWasClicked = {props.whatWasClicked}
            />
        </div>
    );
}

export default Table;