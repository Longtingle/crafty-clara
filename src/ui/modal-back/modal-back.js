import React from 'react';

import './modal-back.css';

const ModalBack = (props) => {
    let output = null;
    console.log(props);
    if (props.showModalBack) {
        output = (
            <div className = "modal-back">
                
            </div>
        )
    }
    return(
        output
    )
}

export default ModalBack