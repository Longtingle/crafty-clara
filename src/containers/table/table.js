import React from 'react';
import Hand from '../hand/hand.js';
import Deck from '../deck-discard/deck-discard.js';

import './table.css';

var Table = function (props) {
    return(
        <div className = 'table'>
            <Deck 
                deck = {props.state.deck}
                discard = {props.state.discard[0]}
                deckClickHandler = {props.deckClickHandler}
            />
            <Hand 
                hand = {props.state.player.hand}
            />
        </div>
    );
}

export default Table;