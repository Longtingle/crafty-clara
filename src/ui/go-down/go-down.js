import React from 'react';
import Card from '../../containers/card/card.js';
import {ENV_VAR} from '../../store/constants.js';

import './go-down.css';

const GoDown = (props) => {
    let output = null;
    let remainingHand = [...props.hand];
    let submittedOutput = null;
    let selectedOutput = null;
    let requirement = null;
    
    if (props.requirement.R === 0 && props.requirement.S > props.submittedSetruns.length) {
        requirement = "SET";
    } else if ((props.requirement.R <= props.submittedSetruns.length) && (props.requirement.S + props.requirement.R > props.submittedSetruns.length)) {
        requirement = "SET";
    } else if (props.requirement.R > props.submittedSetruns.length) {
        requirement = "RUN";
    } else {
        // don't need anything else
        requirement = "NONE";
    }    

    let requirementText = "";
    if (requirement === "SET"){ requirementText = "Please provide a valid SET."};
    if (requirement === "RUN"){ requirementText = "Please provide a valid RUN."};
    if (requirement === "NONE"){ requirementText = "Requirement met, press go down to submit to table"};

    if (props.submittedSetruns.length !== 0){
        submittedOutput = props.submittedSetruns.map((setrun) => {
            let setrunOutput = setrun.cards.map(cardNum => {
                return  <Card 
                            cardName = {props.hand[cardNum]}
                            handClickHandler = {() => false}
                        />
            })
            return (
                <div className = "go-down-setrun-container">
                    <div className = "go-down-selected-submit-container">
                        <div className = "go-down-tick-container" >
                            <img className = "tick-image" alt = "" src={ ENV_VAR.IMG_DIR + "/green-tick.png"}/>
                        </div>
                    </div>
                    <div className = "go-down-setrun-flex">
                        {setrunOutput}
                    </div> 
                </div> 
            )
        })

        props.submittedSetruns.forEach((setrun) => {
            setrun.cards.forEach((cardNum) => {
                remainingHand[cardNum] = "skip";
            })
        })
    }

    if (props.selectedCards.length > 0) {
        let selectedSetrun = props.selectedCards.map((cardNum) => {
            return  <Card 
                        cardName = {props.hand[cardNum]}
                        handClickHandler = {props.selectCardHandler}
                        cardNum = {cardNum}
                    />
        });

        selectedOutput = (
            <div className = "go-down-setrun-container">
                <div className = "go-down-selected-submit-container">
                    <div className = "go-down-selected-submit" onClick = {(event) => props.submitSetrunHandler(event, requirement)}>
                        <p>Submit</p>
                    </div>
                </div>
                <div className = "go-down-setrun-flex">
                    {selectedSetrun}
                </div> 
            </div> 
            
        )
        props.selectedCards.forEach(cardNum => {
            remainingHand[cardNum] = "skip";
        })
    }

    let hand = remainingHand.map((card, index) => {
        let selected = false;
        //if (props.selectedCards.includes(index)) selected = true;
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
                     {requirementText}
                </div>
                <div className = "submitted-container">
                    <div className = "submitted-flex">
                        {submittedOutput}
                        {selectedOutput}
                    </div>
                </div>
                <div className = "modal-buttons-container">
                    <div className = "modal-button" onClick = {(event) => props.submitHandHandler(event, requirement)}>
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