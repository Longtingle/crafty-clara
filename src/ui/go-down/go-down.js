import React from 'react';
import Card from '../../containers/card/card.js';

import './go-down.css';

const GoDown = (props) => {
    let output = null;
    let remainingHand = [...props.hand];
    let submittedOutput = null;
    let requirement = null;
    if (props.requirement.R === 0 && props.requirement.S > props.submittedSetruns.length) {
        requirement = "SET";
    } else if ((props.requirement.R <= props.submittedSetruns.length) && (props.requirement.S + props.requirement.R > props.submittedSetruns.length)) {
        requirement = "SET";
    } else if (props.requirement.R > props.submittedSetruns.length) {
        requirement = "RUN";
    }
    

    if (props.submittedSetruns.length !== 0){

        submittedOutput = props.submittedSetruns.map((setrun) => {
            let setrunOutput = setrun.map(cardNum => {
                return  <Card 
                            cardName = {props.hand[cardNum]}
                            handClickHandler = {() => false}
                        />
            })
            return (
                <div className = "go-down-setrun-container">
                    <div className = "go-down-setrun-flex">
                        {setrunOutput}
                    </div> 
                </div> 
            )
        })

        props.submittedSetruns.forEach((setrun) => {
            setrun.forEach((cardNum) => {
                remainingHand[cardNum] = "skip";
            })
        })
    }
    let hand = remainingHand.map((card, index) => {
        let selected = false;
        if (props.selectedCards.includes(index)) selected = true;
        if (card === "skip") return;
        return <Card 
            cardSelected = {selected}
            cardNum = {index}
            cardName = {card} 
            handClickHandler = {props.selectCardHandler}
        />
    });
    
    if (props.isGoingDown) {
        output = (
            <div className = "go-down-container">
                <div className = "cancel-button" onClick = {props.cancelClickHandler}><p>X</p></div>
                <div className = "go-down-banner">
                     
                </div>
                <div className = "submitted-container">
                    <div className = "submitted-flex">
                        {submittedOutput}
                    </div>
                </div>
                <div className = "modal-buttons-container">
                    <div className = "modal-button" onClick = {(event) => props.submitSetrunHandler(event, requirement)}>
                        <p>Submit Set/Run</p>
                    </div>
                    <div className = "modal-button" onClick = {props.submitSetrunHandler}>
                        <p>Go Down</p>
                    </div>
                </div>
                <div className = "hand-container">
                    {hand}
                </div>
            </div>
        )
    }
    return (
        output
    )
}

export default GoDown;