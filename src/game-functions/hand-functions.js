import _ from 'lodash';
import {SET, RUN} from '../store/constants.js';
import {createCard} from './deck-functions';

const scoreHand = (pHand, requirement) => { //done
    
    if (requirement.S === 0 && requirement.R === 0){
        console.log("requirement should include both R and S");
        throw "requirement should include both R and S";
    }
    let hand = _.cloneDeep(pHand);
    addIndices(hand);
    let redAces = removeRedAces(hand);
    let output = {
        score : 0,
        readyToGoDown : false,
        bestHand : [],
        usefulCards : []
    }
    
    let runCards = [];
    let runsResult;

    if (requirement.R > 0) {
        runsResult = getRuns(hand); 

        if (runsResult.runs.length === 0 && requirement.S === 0) return output;
        if (runsResult.runs.length > 0) {

            runsResult.runs.forEach((run, index) => {
                if (requirement.R <= index) return
                //can we use a red ace for this run?
                if (redAces.length !== 0) {
                    if (run.cards.length === 3 ){ 
                        let aceValue = (run.cards[0].value === 1) ? run.cards[run.cards.length -1].value + 1: run.cards[0].value - 1;
                        run.complete = true;
                        run.score = run.score + 20;
                        redAce[0].value = aceValue;
                        redAce[0].suit = run.cards[0].suit;
                        run.cards.push(redAces.splice(0, 1)[0]);

                    } else {
                        if (run.potentialCards) {
                            run.potentialCards.forEach((card, index) => {                                                      
                                if ((card.value === run.cards[run.cards.length-1].value + 2) || (card.value === run.cards[0].value - 2)) {                                 
                                    let aceValue = (card.value === run.cards[run.cards.length -1].value + 2) ? card.value -1 : card.value + 1;
                                    run.complete = true;
                                    run.score = run.score + 40 - 5;
                                    redAce[0].value = aceValue;
                                    redAce[0].suit = run.cards[0].suit;

                                    run.cards.push(redAces.splice(0, 1)[0]);
                                    run.cards.push(run.potentialCards.splice(index, 1)[0]);
                                }
                            });
                            
                        }
                    }
                }
                output.bestHand.push(
                    run
                );
                output.score = output.score + run.score;
                output.usefulCards.push(...run.cards);
                output.usefulCards.push(...run.potentialCards);
                
                run.cards.forEach(card => {
                    runCards.push(card.index);
                });
            });
            
            output.usefulCards = [...new Set(output.usefulCards)];
        }
    } 

    if (requirement.S === 0) {
        //no sets needed, just return the runs result.
        if (runsResult.numFullRuns >= requirement.R) {output.readyToGoDown = true;}
        return output;
    }
    let setHand = _.cloneDeep(hand);
    runCards.sort((a, b) => b - a);
    runCards.forEach(index => {
        setHand.splice(index, 1);
    })
    
    let setsResult = getSets(setHand);       
    console.log("setsResult", setsResult);

    if (setsResult.sets.length === 0) {
        output.readyToGoDown = false;
        return output;
    }

    setsResult.sets.forEach((set, index) => {
        if (requirement.S <= index) return;
        if (redAces.length !== 0) {
            //can we use an ace?
            if (set.cards.length === 2){
                set.complete = true;
                set.score = set.score + 20;
                redAces[0].value = set.cards[0].value;
                set.cards.push(redAces.splice(0,1)[0]);
            }
        }
        output.bestHand.push(
            set
        );
        output.score = output.score + set.score;
        output.usefulCards.push(...set.cards);
    });

    output.usefulCards = [...new Set(output.usefulCards)];

    //are we ready to go down?
    if (output.bestHand.length === requirement.R + requirement.S) {
        //we have the right number of setruns, are they all complete?
        let ready = true;
        output.bestHand.forEach(setrun => {
            if (!setrun.complete) ready = false;
        })
        output.readyToGoDown = ready;
    }else output.readyToGoDown = false;

    if (output.readyToGoDown) {
        //add possible add-on cards
        output.bestHand.forEach(setrun => {
            insertBuildOptions(setrun);
        })
    }

    console.log("scoreHand", _.cloneDeep(output));
    return output;
}

const insertBuildOptions = (setrun) => { //done
    addons = [];
    if (setrun.type === SET) { 
        //red ace always valid on a set.
        addons.push(createCard(setrun.cards[0].value, "H"));
        addons.push(createCard(setrun.cards[0].value, "D"));
        addons.push(createCard(setrun.cards[0].value, "C"));
        addons.push(createCard(setrun.cards[0].value, "S"));

    } else if (setrun.type === RUN) {
        if (setrun.cards.length != 14) {
            if (setrun.cards[0].value != 1) { 
                addons.push(createCard(setrun.cards[0].value - 1, setrun.cards[0].suit));
            }
            if (setrun.cards[setrun.cards.length -1].value != 14) {
                addons.push(createCard(setrun.cards[setrun.cards.length -1].value + 1, setrun.cards[0].suit));
            }
        }
        setrun.cards.forEach((card) => {
            if (card.ace) { 
                if (card.ace.colour === "red") { 
                    if (!(card.ace.value === card.value && card.ace.suit === card.suit)){
                        addons.push(createCard(card.value, card.suit));
                    }
                }
            }
        })
    }
    setrun.addons = addons;
}

const sortHand = (hand, param) => { //done
    //Sort for sets.
    let sortArray = _.cloneDeep(hand);
    if (param === SET) {
        return sortArray.sort((a, b) => {
            if (a.value < b.value) {
                return -1;
            }else {
                return 1;
            }
        });
    }
    if (param === RUN) { 
        return sortArray.sort((a, b) => {
            if (a.suit < b.suit) return - 1;
            if (b.suit < a.suit) return 1;
            if (a.value < b.value) return - 1;
            if (b.value < a.value) return 1;
            return 0;
        });
    }
}

const getRuns = (hand) => { //done

    let sortedHand = sortHand(hand, RUN);  

    let runs = [];
    let run = {
        cards : [sortedHand[0]]
    };
    
    sortedHand.forEach((card, i) => {
        if (i === 0) return;
        if (card.suit === sortedHand[i-1].suit && card.value === sortedHand[i-1].value + 1 ){
            run.cards.push(card);
            if (i === sortedHand.length - 1 ) {
                if (run.cards.length >=2) {
                    run.complete = (run.cards.length >= 4) ? true : false;
                    run.score = run.cards.length * 20;
                    run.type = RUN;
                    runs.push(run);
                }
            }
        } else {
            if (sortedHand[i-1].value === 13) {
                sortedHand.forEach(chkAce => {
                    if (!chkAce.ace) return;
                    if (chkAce.ace.suit === sortedHand[i-1].suit){
                        let aceAvailable = true;
                        runs.forEach(run => {
                            run.cards.forEach(card => {
                                if (card.index === chkAce.index) {
                                    aceAvailable = false;
                                }
                            });
                        });
                        if (aceAvailable){
                            chkAce.value === 14;
                            run.cards.push(chkAce);
                        }
                    }
                })
            }
            if (run.cards.length >=2) {
               run.complete = (run.cards.length >= 4) ? true : false;
               run.score = run.cards.length * 20;
               run.type = RUN;
               runs.push(run);
            }
            run = {
                cards : [sortedHand[i]]
            };
        }
    })
   
    runs.forEach(run => {
        run.potentialCards = [];
        sortedHand.forEach(card => {
            if(card.suit === run.cards[0].suit && 
                !(run.cards.includes(card)) && 
                (Math.abs(card.value - run.cards[0].value) < 4 || Math.abs(card.value - run.cards[run.cards.length -1].value) < 4 )){
                    run.potentialCards.push(card);
            }
        });
        run.score = run.score + (run.potentialCards.length * 5);
    });

    runs.sort((a, b) => {
        if (a.score > b.score) {return -1}
        if (a.score < b.score) {return 1}
        if (a.cards[0].value > b.cards[0].value) {return -1}
        if (a.cards[0].value < b.cards[0].value) {return 1}
    });

    let fullRunCount = 0;
    runs.forEach(run => {
        if (run.complete) {fullRunCount++}
    });

    let runsSummarised = {
        numFullRuns : fullRunCount,
        runs : runs
    }
    
    return runsSummarised;
}

const removeRedAces = (hand) => { //done
    let redAces = [];
    let redAcesIndex = [];
    

    hand.forEach((card, index) => {
        if (!card.ace) return;
        if (card.ace.colour === "red") {
            redAces.push(card);
            redAcesIndex.push(index);
        }
    })

    redAcesIndex.sort((a, b) => b - a);
    redAcesIndex.forEach((cardNum) => {
        hand.splice(cardNum, 1);
    })
    
    return redAces;
}

const addIndices = (hand) => { //done
    hand.forEach((card, index) => {
        card.index = index;
    });
}

const getSets = (hand) => { //done
    let sortedHand = sortHand(hand, SET);

    let numberCount = {};
    let sets = [];
    let set = {
        cards : [sortedHand[0].value]
    }

    sortedHand.forEach((card, i) => {
        if (i === 0) return;
        if (card.value === sortedHand[i-1].value){
            set.cards.push(card);
            
            if (i === sortedHand.length - 1) {
                if (set.cards.length >= 2) {
                    set.complete = (set.cards.length >= 3) ? true : false;
                    set.score = set.cards.length * 20;
                    set.type = SET;
                    sets.push(set);
                    set = {cards : [sortedHand[i]]};
                }
            }

        } else {
            if (set.cards.length >= 2) {
                set.complete = (set.cards.length >= 3) ? true : false;
                set.score = set.cards.length * 20;
                set.type = SET;
                sets.push(set);
                set = {cards : [sortedHand[i]]};
            }
        }
    });
    
    sets.sort((a, b)=>{
        if (a.score > b.score){return -1}
        if (b.score > a.score){return 1}
        //values are the same, so sort on value
        if (a.cards[0].value > b.cards[0].value){return -1}
        if (b.cards[0].value > a.cards[0].value){return 1}
    });
    //also, add a summary to this object ie. # full sets, best score etc.
    let fullSetCount = 0;
    sets.forEach(set => {
        if (set.complete) {fullSetCount++;}
    })
    let setsSummarised = {
        numFullSets : fullSetCount,
        sets : sets
    }
    return setsSummarised;
}

const sortPlayerHand = (hand, param) => { //done - deprecated
    //param = SET or RUN
    console.log("sortPlayerHand is deprecated - should switch to sortHand");
    return sortHand(hand, param)

    /* OLD FUNCTION
    let handArray = hand.map((card, index) => {
        let value = null;
        let suit = null;
        card.length === 3 ? value = card.substring(0, 2) : value = card.substring(0, 1);
        suit = card.substring(card.length -1);
        return {value : parseInt(value), suit : suit, index : index}
    });

    let sortedHandArray = sortHand(handArray, param);
    sortedHandArray.forEach((card) => {        
        newHand.push(card.value + card.suit);
    })
    return newHand;
    */
}

const sortTableRun = (setrun) => {
    console.log("sortPlayerHand is deprecated - should switch to sortHand");
    let copiedSetrun = _.cloneDeep(setrun);
    copiedSetrun.cards = sortHand(setrun.cards, setrun.type);
    return copiedSetrun;

    /*
    OLD FUNCTION
    console.log("triggered");
    if (pSetrun.type.toUpperCase() === "SET") return pSetrun;
    console.log("runnning");
    //only needs to be made for runs atm.
    //remove aces

    //sort remaining hand
    let setrun = _.cloneDeep(pSetrun);
    let newCards = setrun.cards.filter(card => {
        return (card === "1H" || card === "1D") ? false : true;
    })
    console.log("new Cards", _.cloneDeep(newCards));
    newCards.sort((a, b) => {
        console.log(getValue(a), getValue(b));
        return getValue(a) - getValue(b);
    });
    console.log("new Cards", _.cloneDeep(newCards));
    
    setrun.cards = newCards;
    console.log("setrun.cards", _.cloneDeep(setrun.cards));
    //put red aces back in where they fit
    setrun.cards.forEach((card, cardIndex) => {
        let cardValue = getValue(card);

        //is there a card to go before the start?
        if (cardIndex === 0) {setrun.redAces.forEach(ace => {if (ace.aceAs.value === cardValue - 1) setrun.cards.splice(0, 0, ace.aceAs.value + ace.aceAs.suit)})}
        //is there a card to go after this one?
        setrun.redAces.forEach((ace) => {
            if (ace.aceAs.value === cardValue + 1){
                if (cardIndex === setrun.cards.length - 1){
                    setrun.cards.push(ace.aceAs.value + ace.aceAs.suit)
                } else {
                    setrun.cards.splice(cardIndex + 1, 0 , ace.aceAs.value + ace.aceAs.suit);
                }
            }
        })
    })
    
    return setrun;
    */

}

const checkSetrun = (pSetrun, type, redAces, goDown) => {
    let setrun = _.cloneDeep(pSetrun);
    console.log("checkSetrun start - setrun", _.cloneDeep(setrun));
    console.log("checkSetrun start - redAces", _.cloneDeep(redAces));

    let valid = 1;
    let aceToPlayer;
    let availableAces = (redAces.length > 0) ? _.cloneDeep(redAces) : [];
    let usedAces = [];

    if (redAces.length > setrun.length) return {valid : false};

    console.log("checkSetrun - availableAces init", _.cloneDeep(availableAces));
    console.log("checkSetrun - usedAces init", _.cloneDeep(usedAces));

    // if we're on the table, the ace needs to be put in the hand as what it is replacing
    if (availableAces.length > 0) {
        availableAces.forEach((ace, index) => {
            if (ace.aceAs) {
                ace.aceAs.String = ace.aceAs.value + ace.aceAs.suit;
                if (setrun.includes(ace.aceAs.String) || type === "SET") {    
                    ace.aceToPlayer = true;
                } else {
                    setrun.splice(ace.aceAs.position , 0, ace.aceAs.String);
                }
                usedAces.push(...availableAces.splice(index, 1));
            }
        })        
    }
    
    console.log("aces allocated availableAces", availableAces);
    console.log("aces allocated usedAces", usedAces);
    console.log("setrun + aces", _.cloneDeep(setrun));

    let setrunArray = createHandArray(setrun);

    if (type.toUpperCase() === "SET") {
        //sort the hand if we're not going down.
        let sortedArray = (goDown === true) ? setrunArray : sortHand(setrunArray, "SETS");
        console.log("sortedArray", _.cloneDeep(sortedArray));
        if (setrun.length < 2) valid = 0;
        if (setrun.length < 3 && availableAces.length === 0) valid = 0;

        let setValue = sortedArray[0].value
        sortedArray.forEach(card => {
            if (card.value !== setValue) valid = 0;
        })

        if (valid === 0) return {valid : false};
        
        if (availableAces.length > 0) {
            availableAces[0].aceAs = {
                suit : availableAces[0].original.suit,
                value : setValue
            }
            usedAces.push(...availableAces.splice(0, 1));
        }
    }
    
    if (type.toUpperCase() === "RUN") {

        let sortedArray = (goDown === true) ? setrunArray : sortHand(setrunArray, "RUNS");
        if (setrun.length < 4 && availableAces.length === 0) valid = 0;
        if (setrun.length < 3) valid = 0;
        let runSuit = sortedArray[0].suit;
        sortedArray.forEach((card,index) => {
            if (index !== 0) {
                if (card.suit !== runSuit) {
                    valid = 0;
                }else if (card.value !== sortedArray[index-1].value + 1) {                
                    if (availableAces.length > 0) {
                        availableAces[0].aceAs = {
                            value : sortedArray[index-1].value + 1,
                            suit : runSuit
                        }
                        setrunArray.splice(index, 0, {value : availableAces[0].aceAs.value, suit : availableAces[0].aceAs.suit})
                        usedAces.push(...availableAces.splice(0, 1));
                    } else { valid = 0}
                }
            }
        })

        if (valid === 0) return {valid : false};

        if (availableAces.length > 0) {
            if (sortedArray[0].value > 1) {
                availableAces[0].aceAs = {
                    value : sortedArray[0].value - 1,
                    suit : runSuit
                }
                usedAces.push(...availableAces.splice(0, 1));
            } else if (sortedArray[sortedArray.length - 1].value < 13) {
                availableAces[0].aceAs = {
                    value : sortedArray[sortedArray.length - 1].value + 1,
                    suit : runSuit
                }
                usedAces.push(...availableAces.splice(0, 1));
            } else {
                valid = 0;
            }   
        }
    }


    return {
        valid : true,
        redAce : usedAces
    }

}

const getPoints = (hand) => { //done
    let score = 0;
    
    hand.forEach((card, index) => { 
        if (card.value === 1) {
            score = score + 25;
        } else if (card.value > 9) {
            score = score + 10;
        } else {
            score = score + card.value;
        }
    });
    return score;
}

let testHand =[
    "3C", "2C", "5C", "4C", "1S", "1H", "9S", "8C", "8H"
]
//let testSetrun = ["2C", "3C", "4C", "5C"]; // PLAIN RUN - PASSED
//let testSetrun = ["2C", "2H", "2D"]; // PLAIN SET - PASSED
//let testSetrun = ["2C", "3C", "4C"]; // RUN WITH SPECIFIED ACE - 5C - PASSED
//let testSetrun = ["2C", "3C", "5C"]; // RUN WITH SPECIFIED ACE - 4C - PASSED
//let testSetrun = ["2C", "3C", "1C", "4C"]; // VALID RUN WITH UNSPECIFIED ACE - PASSED
let testSetrun = ["2C", "3C", "1H", "5C"]; // taking the ACE - PASSED

let redAces = [{
    aceAs : {
        value : 4,
        suit : "C"
    },
    original : {
        suit : "H",
        value : 1
    }
}]

let setrun = {
    cards : testSetrun,
    redAces,
    type : "run"
};

sortTableRun(setrun);


const handFunctions = {
    getRuns,
    getSets,
    scoreHand,
    sortHand,
    sortPlayerHand,
    checkSetrun, 
    getPoints,
    sortTableRun,
    insertBuildOptions
}

export {
    getRuns,
    getSets,
    scoreHand,
    sortHand,
    sortPlayerHand,
    checkSetrun,
    getPoints,
    sortTableRun,
    insertBuildOptions
}

export default handFunctions;