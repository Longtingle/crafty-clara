import React from 'react';
import Hand from '../hand/hand.js';

import './table.css';

var Table = function (props) {
    return(
        <div className = 'table'>
            <Hand />
        </div>
    );
}

export default Table;