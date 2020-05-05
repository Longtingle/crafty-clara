import React from 'react';
import Hand from '../hand/hand.js';
import Deck from '../deck-discard/deck-discard.js';
import PlayerTable from '../player-table/player-table.js';
import OpponentArea from '../opponent-area/opponent-area.js';
import './table.css';

var Table = function (props) {
    return(
        <div className = 'table'>
            <OpponentArea  />
            <PlayerTable />
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