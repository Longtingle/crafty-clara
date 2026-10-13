import {AI_CARD_SELECT} from '../store/constants.js';
import {wantsCard, chooseDiscard, planGoDown, findAddition} from '../engine/bot.ts';
import {addToSetrun} from '../engine/setruns.ts';
import params from './params.js';

// The App loop's interface to the bot's decisions in engine/bot.ts. It goes
// once the App plays through the engine.
const AIFunctions = {

    selectDraw : (hand, requirement, discard) =>
        wantsCard(hand, requirement, discard) ? AI_CARD_SELECT.SELECT_DISCARD : AI_CARD_SELECT.SELECT_DECK,

    // Returns the index of the card to discard.
    selectDiscard : (hand, requirement, isDown) => chooseDiscard(hand, requirement, isDown === true),

    drawOOT : (hand, requirement, discard) => wantsCard(hand, requirement, discard),

    canGoDown : (hand, requirement) => {
        let plan = planGoDown(hand, requirement);
        return plan ? {result : true, table : plan.table, newHand : plan.rest} : {result : false};
    },

    resolveOOT : (OOTRequests, AIInPlay) => { //done

        if (OOTRequests.length === 0){
            return {winnerType : "none"};
        }
        if (OOTRequests.length === 1){
            if (OOTRequests[0].type === "AI") {
                return {winnerType : "AI", index : OOTRequests[0].index}
            } else {
                return {winnerType : "player", index : params.numberOfPlayers - 1}
            }
        }
        let check;
        let winner = null;

        check = (AIInPlay === null) ? 0 : AIInPlay + 1;
        for (let i = 0; i < params.numberOfPlayers; i++) {
            OOTRequests.forEach((req) => {
                if (req.index === check) {
                    if (winner === null) {
                        winner = {
                            winnerType : req.type,
                            index : req.index
                        };
                    }
                }
            });
            check = (check === params.numberOfPlayers - 1) ? 0 : check + 1;
        }
        return winner ;


    },

    // Looks for a card in hand that can be added to any setrun on the table.
    AIHandBuild : (hand, AITables, playerTable) => {
        let tables = [...AITables.map(AI => AI.table), playerTable];
        let found = findAddition(hand, tables);
        if (!found) return {result : false};
        let {seat, index} = found.target;
        let added = addToSetrun(tables[seat][index], found.card);
        let cardIndex = hand.indexOf(found.card);
        let newHand = hand.filter((card, i) => i !== cardIndex);
        if (added.returnedAce) newHand.push(added.returnedAce);
        let isPlayer = seat === AITables.length;
        return {
            result : true,
            newSetrun : added.setrun,
            newHand,
            cardIndex,
            playerType : isPlayer ? "player" : "AI",
            setrunIndex : index,
            AIIndex : isPlayer ? null : AITables[seat].index
        };
    }
}


export default AIFunctions;
