// hand for testing sets.
const hand = [
    "2C", "2H", "13H",
    "3D", "4S", "5C",
    "5D", "5S", "12H",
    "12D", "12D", "2H"   
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
    if (param = "SETS") {
        sortArray.sort((a, b) => {
            if (a.value < b.value) {
                return -1;
            }else {
                return 1;
            }
        });
        return sortArray;
    }
    if (param = "RUNS") { 
        //run sorting needs to be implemented still.
        return sortArray;
    }
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