import React from 'react';

import './card.css';

var Card = function (props) {
    return(
        <div className = 'card-wrapper' style = {{zIndex : props.zIndex}}>
            <img 
                className = 'card' 
                src={"http://81.103.140.192:3000/img/cards/" + props.cardName + ".png"}
                style={{zIndex : props.zIndex}}
            ></img>
        </div>
    );
}

export default Card;