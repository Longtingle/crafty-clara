
const hand = [
    //"2D", "3D", "4D", "6D", "7D", "9H",
    //"2C", "12C", "11S", "3H", "9S", "4S"
    "12D", "4H", "2D",
    "2C", "2H", "13H",
    "3C", "4C", "5C",
    "8D", "9D", "10D"
      
];

const requirement = {
    R : 0,
    S : 2
}

const scoreHand = (hand, requirement) => {
    //turn hand into sorting array
    let handArray = hand.map((card, index) => {
        let value = null;
        let suit = null;
        card.length === 3 ? value = card.substring(0, 2) : value = card.substring(0, 1);
        suit = card.substring(card.length -1);
        return {value : parseInt(value), suit : suit, index : index}
    });

    if (requirement.R != 0){
        //we have runs!
        let runsResult = getRuns(handArray);
    }
    if (requirement.R === 0){
        let setsResult = getSets(handArray);
        let score = 0;
        let readyToGoDown = false;
        let bestHand = [];
        let usefulCards = [];
        
        console.log("Set results: ");
        console.log(setsResult);        
        if (setsResult.sets.length === 0) {
            //we have no sets 
            //score is zero, whatever that means.
        }else {
            for (let i = 0; i<setsResult.sets.length && i < requirement.S ; i++){
                bestHand.push(setsResult.sets[i].keys);
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
        
    }else {
        //behaviour for runs needs to be added.
        return;
    }
    
    

    return {
        readyToGoDown : false,
        bestHand : [
            [5, 6, 7], [8, 9]
        ]
    };
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
            if (a.suit < b.suit) {return - 1}
            if (b.suit < a.suit) {return 1}
            if (a.value < b.value) {return - 1}
            if (b.value < a.value) {return 1}
        });
    }
}

getRuns = (handArray) => {
    let sortedHand = sortHand(handArray, "RUNS");
    let activeSuit = sortedHand[0].suit;
    let runLength = 1;
    let complete = false;
    let runKeys = [sortedHand[0].index];
    let runValues = [sortedHand[0].value];
    let potentialKeys = [];
    let runs = [];
    console.log(sortedHand);
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
        console.log(run);
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

    

    console.log(runs);
}

getSets = (handArray) => {
    let sortedHand = sortHand(handArray, "SETS");
    let numberCount = {};
    let sets = [];

    for (let x = 1; x<14 ; x++){
        numberCount[x] = {};
        numberCount[x].count = 0;
        numberCount[x].keys = [];
        for (let i = 0; i<sortedHand.length; i++){
            if (sortedHand[i].value == x){
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

console.clear();
let result = scoreHand(hand, requirement);
console.log(result);