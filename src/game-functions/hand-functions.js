import _ from 'lodash';
import { unstable_renderSubtreeIntoContainer } from 'react-dom';

const scoreHand = (hand, requirement) => {

    if (requirement.S === 0 && requirement.R === 0){
        console.log("requirement should include both R and S");
        throw "requirement should include both R and S";
    }

    let output = {
        score : 0,
        readyToGoDown : false,
        bestHand : [],
        usefulCards : []
    }
    let result = removeRedAces(createHandArray(hand));
    let handArray = _.cloneDeep(result.handArray);
    let redAces = result.redAces;
    let runCards = [];
    let runsResult;

    if (requirement.R > 0) {
        runsResult = getRuns(handArray);

        if (runsResult.runs.length === 0 && requirement.S === 0) return output;
        if (runsResult.runs.length > 0) {

            runsResult.runs.forEach((run, index) => {
                if (requirement.R <= index) return
                //can we use a red ace for this run?
                if (redAces.length !== 0) {
                    if (run.keys.length === 3 ){ 
                        let aceValue = (run.values[0] === 1) ? run.values[run.values.length - 1] + 1: run.values[0] - 1;
                        run.complete = true;
                        run.score = run.score + 20;
                        run.aceUsed = {
                            aceAs : {
                                value : aceValue,
                                suit : run.suit
                            },
                            original : redAces.splice(0, 1)[0]
                        }
                    } else {
                        if (run.potentialKeys) {
                            run.potentialKeys.forEach((key, index) => {
                                let potCard = handArray[key];                                                       
                                if ((potCard.value === run.values[run.values.length - 1] + 2) || (potCard.value === run.values[0] - 2)) {
                                    //use ace
                                    let aceValue = (potCard.value === run.values[run.values.length - 1] + 2) ? potCard.value -1 : potCard.value + 1;
                                    run.complete = true;
                                    run.score = run.score + 20;
                                    run.aceUsed = {
                                        aceAs : {
                                            value : aceValue,
                                            suit : run.suit
                                        },
                                        original : redAces.splice(0, 1)[0]
                                    };
                                    run.keys.push(key);
                                    run.values.push(handArray[key].value);
                                    run.potentialKeys.splice(index, 1);
                                }
                            });
                        }
                    }
                }

                output.bestHand.push({ 
                    run
                });
                output.score = output.score + run.score;
                output.usefulCards.push(...run.keys);
                output.usefulCards.push(...run.potentialKeys);
                
                run.keys.forEach(key => {
                    runCards.push(handArray[key]);
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
    let setHandArray = _.cloneDeep(handArray);
    runCards.sort((a, b) => b.index - a.index);
    runCards.forEach(card => {
        setHandArray.splice(card.index, 1);
    })

    let setsResult = getSets(setHandArray);       

    if (setsResult.sets.length === 0) {
        output.readyToGoDown = false;
        return output;
    }

    setsResult.sets.forEach((set, index) => {
        if (requirement.S <= index) return;
        if (redAces.length !== 0) {
            //can we use an ace?
            if (set.keys.length === 2){
                set.complete = true;
                set.score = set.score + 20;
                set.aceUsed = {
                    aceAs : {
                        value : set.value,
                        suit : redAces[0].suit
                    },
                    original : redAces.splice(0, 1)[0]
                }
            }
        }
        output.bestHand.push({ 
            set
        });
        output.score = output.score + set.score;
        output.usefulCards.push(...set.keys);
    });

    //are we ready to go down?
    if (output.bestHand.length === requirement.R + requirement.S) {
        //we have the right number of setruns, are they all complete?
        let ready = true;
        output.bestHand.forEach(setrun => {
            if (setrun.complete === false) ready = false;
        })
        output.readyToGoDown = ready;
    }else output.readyToGoDown = false;
    console.log("scoreHand", _.cloneDeep(output));
    return output;


    

    /*
    }else {
        for (let i = 0; i<setsResult.sets.length && i < requirement.S ; i++){
            bestHand.push({
                type : "set", 
                keys : setsResult.sets[i].keys,
                complete : setsResult.sets[i].complete,
                score : setsResult.sets[i].score
            });
            score = score + setsResult.sets[i].score;
        }
        for (let i = 0; i < setsResult.sets.length; i++){
            usefulCards.push(...setsResult.sets[i].keys)
        }
        if (setsResult.numFullSets >= requirement.S) {readyToGoDown = true;}
            //ready to go down and full score.
            usefulCards = [...new Set(usefulCards)];
        return {
            score : score,
            readyToGoDown : readyToGoDown,
            bestHand : bestHand,
            usefulCards : usefulCards
        }
    }
*/
    return;
    //OLD FUNCTION FROM HERE

    /*
    if (requirement.R === 0){

        //no runs, only sets.
        let setsResult = getSets(handArray);       
        if (setsResult.sets.length === 0) {
            //we have no sets return zero score (initialised values for variables.)
            return {
                score : score,
                readyToGoDown : readyToGoDown,
                bestHand : bestHand,
                usefulCards : usefulCards
            }
        }else {
            for (let i = 0; i<setsResult.sets.length && i < requirement.S ; i++){
                bestHand.push({
                    type : "set", 
                    keys : setsResult.sets[i].keys,
                    complete : setsResult.sets[i].complete,
                    score : setsResult.sets[i].score
                });
                score = score + setsResult.sets[i].score;
            }
            for (let i = 0; i < setsResult.sets.length; i++){
                usefulCards.push(...setsResult.sets[i].keys)
            }
            if (setsResult.numFullSets >= requirement.S) {readyToGoDown = true;}
                //ready to go down and full score.
                usefulCards = [...new Set(usefulCards)];
            return {
                score : score,
                readyToGoDown : readyToGoDown,
                bestHand : bestHand,
                usefulCards : usefulCards
            }
        }
        
    }

    if (requirement.S === 0){
        //no sets only runs
        let runsResult = getRuns(handArray);

        if (runsResult.runs.length === 0) {
            //we have no runs return zero score (initialised values for variables.)
            return {
                score : score,
                readyToGoDown : readyToGoDown,
                bestHand : bestHand,
                usefulCards : usefulCards
            }
        }else {

            for (let i = 0; i<runsResult.runs.length && i < requirement.R ; i++){
                bestHand.push({ 
                    type : "run",
                    keys : runsResult.runs[i].keys,
                    complete : runsResult.runs[i].complete,
                    score : runsResult.runs[i].score
                });
                score = score + runsResult.runs[i].score;
            }
            for (let i = 0; i < runsResult.runs.length; i++){
                usefulCards.push(...runsResult.runs[i].keys);
                usefulCards.push(...runsResult.runs[i].potentialKeys);
            }
            
            usefulCards = [...new Set(usefulCards)];
               
            if (runsResult.numFullRuns >= requirement.R) {readyToGoDown = true;}
            
            return {
                score : score,
                readyToGoDown : readyToGoDown,
                bestHand : bestHand,
                usefulCards : usefulCards
            }
        }
    }

    if (requirement.R !== 0 && requirement.S !== 0){
        //we have both runs and sets to deal with!
        let runsResult = getRuns(handArray);
        let runScore = {};
        if (runsResult.runs.length === 0) {
            //we have no runs return zero score (initialised values for variables.)
            runScore =  {
                score : score,
                readyToGoDown : readyToGoDown,
                bestHand : bestHand,
                usefulCards : usefulCards
            }
        }else {

            for (let i = 0; i<runsResult.runs.length && i < requirement.R ; i++){
                bestHand.push({ 
                    type : "run",
                    keys : runsResult.runs[i].keys,
                    complete : runsResult.runs[i].complete,
                    score : runsResult.runs[i].score
                });
                score = score + runsResult.runs[i].score;
            }
            for (let i = 0; i < runsResult.runs.length; i++){
                usefulCards.push(...runsResult.runs[i].keys);
                usefulCards.push(...runsResult.runs[i].potentialKeys);
            }
            
            usefulCards = [...new Set(usefulCards)];
               
            if (runsResult.numFullRuns >= requirement.R) {readyToGoDown = true;}
                
            runScore = {
                score : score,
                readyToGoDown : readyToGoDown,
                bestHand : bestHand,
                usefulCards : usefulCards
            }
        }
        
        let handArrayCopy = [...handArray];
        handArrayCopy.forEach((card, index)=> {
            for (let i = 0; i < runScore.bestHand.length; i++){
                if (runScore.bestHand[i].keys.includes(card.index)) {
                    handArrayCopy.splice(index,1);
                }
            } 
        })
        
        let setScore = {};
        score = 0;
        readyToGoDown = false;
        bestHand = [];
        usefulCards = [];
        let setsResult = getSets(handArrayCopy);            
        if (setsResult.sets.length === 0) {
            //we have no sets return zero score (initialised values for variables.)
            setScore = {
                score : 0,
                readyToGoDown : false,
                bestHand : [],
                usefulCards : []
            }
        }else {
            for (let i = 0; i<setsResult.sets.length && i < requirement.S ; i++){
                bestHand.push({
                    type : "set", 
                    keys : setsResult.sets[i].keys,
                    complete : setsResult.sets[i].complete,
                    score : setsResult.sets[i].score
                });
                score = score + setsResult.sets[i].score;
            }
            for (let i = 0; i < setsResult.sets.length; i++){
                usefulCards.push(...setsResult.sets[i].keys)
            }
            if (setsResult.numFullSets >= requirement.S) {readyToGoDown = true;}
                //ready to go down and full score.
            setScore = {
                score : score,
                readyToGoDown : readyToGoDown,
                bestHand : bestHand,
                usefulCards : usefulCards
            }
        }
        bestHand = [...setScore.bestHand, ...runScore.bestHand];
        usefulCards = [...setScore.usefulCards, ...runScore.usefulCards];
        usefulCards = [...new Set(usefulCards)];
        return { 
            score : setScore.score + runScore.score,
            readyToGoDown : setScore.readyToGoDown && runScore.readyToGoDown,
            bestHand : bestHand,
            usefulCards : usefulCards

        }
    }*/

}
const createHandArray = (hand) => {
    let handArray = hand.map((card, index) => {
        let value = null;
        let suit = null;
        card.length === 3 ? value = card.substring(0, 2) : value = card.substring(0, 1);
        suit = card.substring(card.length -1);
        return {value : parseInt(value), suit : suit, index : index}
    });
    return handArray;
}

const sortHand = (handArray, param) => {
    //Sort for sets.
    let sortArray = _.cloneDeep(handArray);
    if (param === "SETS") {
        return sortArray.sort((a, b) => {
            if (a.value < b.value) {
                return -1;
            }else {
                return 1;
            }
        });
    }
    if (param === "RUNS") { 
        return sortArray.sort((a, b) => {
            if (a.suit < b.suit) return - 1;
            if (b.suit < a.suit) return 1;
            if (a.value < b.value) return - 1;
            if (b.value < a.value) return 1;
            return 0;
        });
    }
}

const getRuns = (handArray) => {
    //sort hand for runs.
    let sortedHand = sortHand(handArray, "RUNS");    
    
    let activeSuit = sortedHand[0].suit;
    let runLength = 1;
    let complete = false;
    let runKeys = [sortedHand[0].index];
    let runValues = [sortedHand[0].value];
    let runs = [];
   
    for (let i = 1; i < sortedHand.length; i++){ 
        if (sortedHand[i].suit === sortedHand[i-1].suit && sortedHand[i].value === sortedHand[i-1].value + 1){
            //we have 2 consecutive cards.
            runLength ++;
            runKeys.push(sortedHand[i].index);
            runValues.push(sortedHand[i].value);

        }else{
            //are we on card 13 with an ace that could be 14 in the hand?
            if (sortedHand[i].value === 13) { 
                //we're on a king, search for the ace ..
                for (let j = 0; j < i; j++) {
                    if (sortedHand[j].value === 1 && sortedHand[j].suit === sortedHand[i].suit) {
                        //it's the ace we need for the end, check it's not in the used keys for a run
                        let aceUsed = false;
                        runs.forEach((run, index) => {
                            if (run.keys.includes(sortedHand[j].index)){aceUsed = true;}
                        })
                        if (runKeys.includes(sortedHand[j].index)){aceUsed = true}

                        if (aceUsed === false) {
                            runLength ++;
                            runKeys.push(sortedHand[j].index);
                            runValues.push(sortedHand[i].value);
                        }
                    }
                }
            }
            //if we have a run, store it. in any case, reset.
            if (runLength >= 2) {
                runLength >= 4 ? complete = true : complete = false;
                //store the run
                runs.push({
                    type : "run",
                    complete : complete,
                    values : runValues,
                    suit : activeSuit,
                    keys : runKeys,
                    score : runLength * 20
                });
            }
            runKeys = [sortedHand[i].index];
            runLength = 1;
            activeSuit = sortedHand[i].suit;
            complete = false;
            runValues = [sortedHand[i].value]
        }
        if (i === sortedHand.length -1 && runLength >= 2){
            runLength >= 4 ? complete = true : complete = false;
            //store the run
            runs.push({
                type : "run",
                complete : complete,
                values : runValues,
                suit : activeSuit,
                keys : runKeys,
                score : runLength * 20
            });
        }
    }
    //add potential tag-ons to runs
    runs.forEach(run => {
        run.potentialKeys = [];
        sortedHand.forEach(card => {
            if(card.suit === run.suit && 
                !(run.keys.includes(card.index)) && 
                (Math.abs(card.value - run.values[0]) < 4 || Math.abs(card.value - run.values[run.values.length -1]) < 4 )){
                    
                    run.potentialKeys.push(card.index);
            }
        });
        run.score = run.score + (run.potentialKeys.length * 5);
    });

    runs.sort((a, b) => {
        if (a.score > b.score) {return -1}
        if (a.score < b.score) {return 1}
        if (a.values.reduce((a,b) => a+b) > b.values.reduce((a,b) => a+b)){return -1}
        if (a.values.reduce((a,b) => a+b) < b.values.reduce((a,b) => a+b)){return 1}
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

const removeRedAces = (handArray) => {
    let redAces = [];
    let redAcesIndex = [];
    let returnArray = _.cloneDeep(handArray);

    returnArray.forEach((card, index) => {
        if (card.value === 1 && (card.suit === "D" || card.suit === "H")) {
            //red ace
            redAces.push(card);
            redAcesIndex.push(index);
        }
    })

    redAcesIndex.sort((a, b) => b - a);
    redAcesIndex.forEach((cardNum) => {
        returnArray.splice(cardNum, 1);
    })
    
    return {
        redAces,
        handArray : returnArray
    }
}

const getSets = (handArray) => {
    let sortedHand = sortHand(handArray, "SETS");
    let numberCount = {};
    let sets = [];

    for (let x = 1; x<14 ; x++){
        numberCount[x] = {};
        numberCount[x].count = 0;
        numberCount[x].keys = [];
        for (let i = 0; i<sortedHand.length; i++){
            if (sortedHand[i].value === x){
                numberCount[x].count = numberCount[x].count + 1;
                numberCount[x].keys.push(sortedHand[i].index);
            }
        }
        
        if (numberCount[x].count >=3){
            //this is a set
            sets.push({
                type: "set",
                complete : true,
                value : x,
                keys : numberCount[x].keys,
                score : numberCount[x].count * 20
            });
        }else if (numberCount[x].count === 2) {
            //this is a partial set
            sets.push({
                type: "set",
                complete : false,
                value : x,
                keys : numberCount[x].keys,
                score : numberCount[x].count * 20
            });
        }
    }
    sets.sort((a, b)=>{
        if (a.score > b.score){return -1}
        if (b.score > a.score){return 1}
        //values are the same, so sort on value
        if (a.value > b.value){return -1}
        if (b.value > a.value){return 1}
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

const sortPlayerHand = (hand, param) => {
    //param = "SETS" or "RUNS"
    let newHand = [];

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
}

const checkSetrun = (setrun, type, redAces) => {
    let valid = 1;
    let setrunArray = createHandArray(setrun);
    let aceToPlayer;
    let aceAs;
    let aceAvailable = (redAces) ? true : false;
    let returnAce;

    // if we're on the table, the ace needs to be put in the hand as what it is replacing
    if (aceAvailable && redAces.aceAs) {
        //has the ace just been swapped?
        aceAs = redAces.aceAs.value + redAces.aceAs.suit;
        if (setrun.includes(aceAs)) {
            return {
                valid : true,
                aceToPlayer : true
            }
        } else {
            setrun.push(aceAs);
            aceAvailable = false;
        }
    }


    if (type.toUpperCase() === "SET") {

        if (setrun.length < 2) valid = 0;
        if (setrun.length < 3 && !aceAvailable) valid = 0;

        let setValue = setrunArray[0].value
        setrunArray.forEach(card => {
            if (card.value !== setValue) valid = 0;
        })

        if (valid === 0) return {valid : false};
        
        if (aceAvailable) {
            aceAs = {
                suit : redAces.original.suit,
                value : setValue
            };
            aceAvailable = false;
        }
    }
    
    if (type.toUpperCase() === "RUN") {

        let sortedArray = sortHand(setrunArray, "RUNS");
        
        if (setrun.length < 4 && !aceAvailable) valid = 0;
        if (setrun.length < 3) valid = 0;

        let runSuit = sortedArray[0].suit;
        sortedArray.forEach((card,index) => {
            if (index !== 0) {
                if (card.suit !== runSuit) {
                    valid = 0;
                }else if (card.value !== setrunArray[index-1].value + 1) {
                    if (aceAvailable) {
                        aceAs = {
                            value : setrunArray[index-1].value + 1,
                            suit : runSuit
                        }
                        aceAvailable = false;
                        setrunArray.splice(index, 0, {value : aceAs.value, suit : aceAs.suit})
                    } else { valid = 0}
                }
            }
        })

        if (valid === 0) return {valid : false};

        if (aceAvailable) {
            if (sortedArray[0].value > 1) {
                aceAs = {
                    value : sortedArray[0].value - 1,
                    suit : runSuit
                }
                aceAvailable = false;
            } else if (sortedArray[sortedArray.length - 1].value < 13) {
                aceAs = {
                    value : sortedArray[sortedArray.length - 1].value + 1,
                    suit : runSuit
                }
            }
        }
    }

    

    if (redAces) {
        returnAce = {
            aceAs,
            original : redAces.original
        }
    } else {returnAce = null}

    return {
        valid : true,
        aceToPlayer : false,
        redAce : returnAce
    }

}

const getPoints = (hand) => {
    let score = 0;
    let handArray = createHandArray(hand);
    handArray.forEach((card, index) => {
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

console.log(scoreHand(testHand, {R:1, S:1}));


const handFunctions = {
    getRuns,
    getSets,
    scoreHand,
    sortHand,
    sortPlayerHand,
    checkSetrun, 
    getPoints
}

export {
    getRuns,
    getSets,
    scoreHand,
    sortHand,
    sortPlayerHand,
    checkSetrun,
    getPoints
}

export default handFunctions;