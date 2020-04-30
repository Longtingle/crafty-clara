//TODO 
//Need to expose more paramters about the 'best hand', including individual run/set scores and run/set completion status. 
//This will help when deciding whether it's worth picking up out of turn or not.


const scoreHand = (hand, requirement) => {

    if (requirement.S === 0 && requirement.R === 0){
        console.log("requirement should include both R and S");
        throw "requirement should include both R and S";
    }

    let score = 0;
    let readyToGoDown = false;
    let bestHand = [];
    let usefulCards = [];

    //turn hand into sorting array
    let handArray = hand.map((card, index) => {
        let value = null;
        let suit = null;
        card.length === 3 ? value = card.substring(0, 2) : value = card.substring(0, 1);
        suit = card.substring(card.length -1);
        return {value : parseInt(value), suit : suit, index : index}
    });

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
        return { 
            score : setScore.score + runScore.score,
            readyToGoDown : setScore.readyToGoDown && runScore.readyToGoDown,
            bestHand : bestHand,
            usefulCards : usefulCards

        }
    }

}

const sortHand = (sortArray, param) => {
    //Sort for sets.
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
    let potentialKeys = [];
    let runs = [];
   
    for (let i = 1; i < sortedHand.length; i++){ 
        if (sortedHand[i].suit === sortedHand[i-1].suit && sortedHand[i].value === sortedHand[i-1].value + 1){
            //we have 2 consecutive cards.
            runLength ++;
            runKeys.push(sortedHand[i].index);
            runValues.push(sortedHand[i].value);

        }else{
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
        potentialKeys = [];
        sortedHand.forEach(card => {
            if(card.suit === run.suit && 
                !(run.keys.includes(card.index)) && 
                (Math.abs(card.value - run.values[0]) < 4 || Math.abs(card.value - run.values[run.values.length -1]) < 4 )){
                    
                    potentialKeys.push(card.index);
            }
        });
        run.potentialKeys = potentialKeys;
        run.score = run.score + (potentialKeys.length * 5);
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

const handFunctions = {
    getRuns,
    getSets,
    scoreHand,
    sortHand
}

export {
    getRuns,
    getSets,
    scoreHand,
    sortHand
}

export default handFunctions;