//react/redux imports
import React, {Component} from 'react';
import {connect} from 'react-redux';

//import constants
import actions from './store/actions.js';
import GAME_STATES from './store/constants.js';
import {AI_CARD_SELECT, SET, RUN} from './store/constants.js';

//import helper functions
import deckFunctions from './game-functions/deck-functions.js';
import params from './game-functions/params.js';
import AIFunctions from './game-functions/AI-functions.js';
import handFunctions, { sortHand } from './game-functions/hand-functions.js';
import _ from 'lodash';

//import react components
import Table from './containers/table/table.js';
import Home from './ui/home/home.js';
import ModalBack from './ui/modal-back/modal-back.js';
import GoDown from './ui/go-down/go-down';
import RoundEnd from './ui/round-end/round-end.js';

//import CSS
import './App.css';


class App extends Component {
    
    playerOOTRequest = null;

    constructor (props) {
        super(props);
        this.playerHandSortRuns = this.playerHandSortRuns.bind(this);
        this.playerHandSortSets = this.playerHandSortSets.bind(this);
        this.playerAddCardToTable = this.playerAddCardToTable.bind(this);
        this.startNextRound = this.startNextRound.bind(this);
        this.handDragOnDrop = this.handDragOnDrop.bind(this);
    }
    
    render() {
        
        let output;
        if (this.props.state.game.gameState === GAME_STATES.NO_GAME) {
            output = (
                <Home startGameHandler = {this.newGameHandler} />
            );
        } else { 
            output = (
                <div className = "App">
                    <ModalBack showModalBack = {this.props.state.UI.showModalBack}/>
                    <RoundEnd 
                        endOfRound = {this.props.state.UI.endOfRound}
                        AIPlayers = {this.props.state.AI.players}
                        player = {this.props.state.player}
                        game = {this.props.state.game}
                        nextRoundHandler = {this.startNextRound}
                    />
                    <GoDown 
                        isGoingDown = {this.props.state.player.isGoingDown}
                        cancelClickHandler = {this.props.cancelPlayerGoDown}
                        hand = {this.props.state.player.hand}
                        requirement = {this.props.state.game.requirement}
                        selectedCards = {this.props.state.UI.goingDown.selectedCards}
                        submittedSetruns = {this.props.state.UI.goingDown.submittedSetruns}
                        selectCardHandler = {this.goDownSelectCard}
                        submitSetrunHandler = {this.goDownSubmitSetrun}
                        submitHandHandler = {this.goDownSubmitHand}
                    />
                    <Table
                        playerAddCardToTable = {this.playerAddCardToTable}
                        playerHandSortSets = {this.playerHandSortSets}
                        playerHandSortRuns = {this.playerHandSortRuns}
                        goDownClickHandler = {this.goDownClickHandler}
                        deckClickHandler = {this.deckClickHandler}
                        handClickHandler = {this.handClickHandler}
                        discardClickHandler = {this.discardClickHandler}
                        state = {this.props.state}
                        handDragOnDrop = {this.handDragOnDrop}
                    />
                </div>
            )
        }
            
        return(
            output
        );
    }

    //HAND DRAG AND DROP HANDLERS

    handDragOnDrop(pickPosition, dropPosition) {
        console.log("handDragOnDrop", pickPosition, dropPosition);
        let newHand = [...this.props.state.player.hand];

        if (pickPosition <  dropPosition){
            newHand.splice(dropPosition + 1, 0, newHand[pickPosition]);
            newHand.splice(pickPosition, 1);
        } else if (dropPosition < pickPosition) {
            let movedCard = newHand.splice(pickPosition, 1);
            newHand.splice(dropPosition + 1, 0, movedCard[0]);
        }
        this.props.sortPlayerHand(newHand);
    }

    componentDidUpdate() {
        console.log("Component did update: ", Date.now());

        //check if anyone is out
        if (this.props.state.player.hand.length === 0) {
            this.endRound();
            return;
        } 
        let AIOut =false;
        this.props.state.AI.players.forEach(player => {
            if (player.hand.length === 0) {
                AIOut = true;
                return;
            }
        });
        if (AIOut === true) {
            this.endRound();
            return;
        }

        if (this.props.state.AI.messageUpdate !== null) {
            let AIIndex = this.props.state.AI.messageUpdate;
            setTimeout(() => {
                this.props.removeAIMessage(AIIndex);
            }, 2000);
        }

        //HALT execution here if the state change a gameUpdate.
        if (this.props.state.game.gameUpdate === false) return;

        if (this.props.state.game.gameState === GAME_STATES.AI_DRAW) { 
            if (this.props.state.discard.length === 0) { 
                this.props.AIPickedFromDeck();
                return;
            }
            let drawResult = AIFunctions.selectDraw(
                this.props.state.AI.players[this.props.state.AI.AIInPlay].hand, 
                this.props.state.game.requirement, 
                this.props.state.discard[0]);
            setTimeout(() => {
                (drawResult === AI_CARD_SELECT.SELECT_DECK) ? this.props.AIPickedFromDeck() : this.props.AIPickedFromDiscard();
            }, 1000);
            

            return;
        }

        //If the state shows that the active AI needs to wait, trigger that action.
        if (this.props.state.game.gameState === GAME_STATES.AI_WAIT_ONE) {
            setTimeout(() => {this.props.AIWaitOneComplete()}, 3000);
            return;
        }

        if (this.props.state.game.gameState === GAME_STATES.AI_DRAW_OOT) {
            //generate draw OOT requests.
            let OOTRequests = [];
            if ((this.props.state.discard.length === 0) || (this.props.state.discardCovered === true)){
                this.props.AIOOTRequests(OOTRequests);
                return;
            }
            this.props.state.AI.players.forEach((player, index) => {
                if (!player.isDown){
                    if (AIFunctions.drawOOT(player.hand, this.props.state.game.requirement, this.props.state.discard[0])) {
                        if (player.index !== this.props.state.AI.AIInPlay){
                            OOTRequests.push({type : "AI", index}) ;       
                        }
                    }
                }
            });
            this.props.AIOOTRequests(OOTRequests);
            return;
        }

        if (this.props.state.game.gameState === GAME_STATES.AI_WAIT_TWO) {
            setTimeout(() => {this.props.AIWaitTwoComplete()}, 3000);
            return;
        }

        if (this.props.state.game.gameState === GAME_STATES.AI_OOT_RESOLVE) {
            

            let OOTRequests = [...this.props.state.OOTRequests];
            //console.log(OOTRequests);
            if (this.playerOOTRequest) OOTRequests.push(this.playerOOTRequest);
            //console.log(OOTRequests);
            let OOTResult = AIFunctions.resolveOOT(OOTRequests, this.props.state.AI.AIInPlay);
            //console.log(OOTResult);
            this.props.drawOOTResolve(OOTResult);
            this.playerOOTRequest = null;
            return;
        }

        if (this.props.state.game.gameState === GAME_STATES.AI_PLAY) {

            let goDownResult;
            if (this.props.state.AI.players[this.props.state.AI.AIInPlay].isDown === false) {
                goDownResult = AIFunctions.canGoDown(this.props.state.AI.players[this.props.state.AI.AIInPlay].hand, this.props.state.game.requirement);
                if (goDownResult.result === false) {
                    let discardIndex = AIFunctions.selectDiscard(this.props.state.AI.players[this.props.state.AI.AIInPlay].hand, this.props.state.game.requirement);
                    this.props.fromAIToDiscard(discardIndex);
                } else if (goDownResult.result === true){
                    //we can go down, check for hand building with new hand

                    this.props.AIGoDownSubmit(goDownResult.table, goDownResult.newHand);
                }
            } else {
                //AI is down - check for hand building 
                let AITables = [];
                    this.props.state.AI.players.forEach((player, index) => {
                        AITables.push({
                            type : "AI",
                            index,
                            table : player.table
                        });
                    });
                let handBuildResult = AIFunctions.AIHandBuild(this.props.state.AI.players[this.props.state.AI.AIInPlay].hand, AITables, this.props.state.player.table);
                console.log("AI Hand Build Result");
                console.log(handBuildResult);
                
                if (handBuildResult.result === false) { 
                    this.props.fromAIToDiscard(0);
                } else {
                    this.props.AIAddCardToTable(handBuildResult.newSetrun,handBuildResult.newHand, handBuildResult.playerType, handBuildResult.setrunIndex, handBuildResult.AIIndex)
                }
            }
        }
    }

    newGameHandler = () => {
        //generate deck with 2 shuffled packs of cards
        let deck = deckFunctions.generateDeck(2);
        //deal into numbers of hands required.
        let hands = deckFunctions.deal(deck, params.numberOfPlayers);
    
        let discard = [];
        discard.push(deck[0])
        deck.shift();
        this.props.startNewGame(deck, hands, discard);
    }

    deckClickHandler = () => {
        if (this.props.state.game.gameState === GAME_STATES.PW_DRAW_CARD) {
            this.props.fromDeckToPlayer();
        }
    }

    discardClickHandler = () => {
        console.log("discardClickHandler triggered.");
        if (this.props.state.game.gameState === GAME_STATES.PW_DRAW_CARD && 
            this.props.state.discard.length > 0) {
            this.props.fromDiscardToPlayer();
        } else if ( 
            this.props.state.game.gameState === GAME_STATES.PW_PLAY && 
            this.props.state.player.cardSelected !== null && 
            !this.props.state.player.isGoingDown
        ){
            let OOTResult = AIFunctions.resolveOOT(this.props.state.OOTRequests, this.props.state.AI.AIInPlay);
            console.log(OOTResult);
            if (OOTResult.winnerType !== "none") {
                this.props.drawOOTResolve(OOTResult);
            }
            this.props.fromHandToDiscard();
        } else if (this.props.state.game.gameState !== GAME_STATES.PW_PLAY && 
            this.props.state.game.gameState !== GAME_STATES.PW_DRAW_CARD &&
            this.props.state.discardCovered !== true){
            this.playerOOTRequest = {type : "player", index : params.numberOfPlayers - 1}
        }

    }

    handClickHandler = (event, cardNum) => { 
        console.log(cardNum);
        if (this.props.state.game.gameState === GAME_STATES.PW_PLAY && this.props.state.player.isGoingDown === false) {
            //we're not in going down mode, so get the card selected ready for going onto the table or going onto the discard.
            this.props.selectCardFromHand(cardNum);
        }
    }

    playerHandSortRuns() {
        //if (this.props.state.game.gameState !== GAME_STATES.PW_PLAY &&
        //    this.props.state.game.gameState !== GAME_STATES.PW_DRAW_CARD) return;
        let newHand = handFunctions.sortPlayerHand(this.props.state.player.hand, "RUNS");
        this.props.updatePlayerHand(newHand);
    }

    playerHandSortSets() {
        //if (this.props.state.game.gameState !== GAME_STATES.PW_PLAY && 
        //    this.props.state.game.gameState !== GAME_STATES.PW_DRAW_CARD) return;
        let newHand = handFunctions.sortPlayerHand(this.props.state.player.hand, "SETS");
        this.props.updatePlayerHand(newHand);
    }

    goDownClickHandler = () => {
        if (this.props.state.player.isDown) return;
        if (this.props.state.game.gameState !== GAME_STATES.PW_PLAY) return;
        this.props.showGoingDownModal();
    }

    cancelPlayerGoDown = () => {
        this.props.cancelPlayerGoDown();
    }

    goDownSelectCard = (event, cardNum) => {
        this.props.goDownSelectCard(cardNum);
    }
    
    goDownSubmitSetrun = (event, requirement) => {
        let redAces = [];
        if (this.props.state.UI.goingDown.selectedCards.length === 0) return;
        if (requirement === "NONE") return;
        let setrun = this.props.state.UI.goingDown.selectedCards.map((cardNum, index) => {
            if (this.props.state.player.hand[cardNum] === "1H" || this.props.state.player.hand[cardNum] === "1D" ) {
                let original = {
                    value : getValue(this.props.state.player.hand[cardNum]),
                    suit : getSuit(this.props.state.player.hand[cardNum])
                }
                if (requirement === "SET") {
                    let aceValue = (index !== 0) ? getValue(this.props.state.player.hand[this.props.state.UI.goingDown.selectedCards[0]]) : getValue(this.props.state.player.hand[this.props.state.UI.goingDown.selectedCards[1]]);
                    redAces.push({
                        aceAs : {
                            suit : original.suit,
                            value : aceValue
                        },
                        original
                    });
                } else {
                    let aceValue = (index !== 0) ? getValue(this.props.state.player.hand[this.props.state.UI.goingDown.selectedCards[index - 1]]) + 1 : getValue(this.props.state.player.hand[this.props.state.UI.goingDown.selectedCards[index + 1]]) -1;
                    let aceSuit = (index !== 0) ? getSuit(this.props.state.player.hand[this.props.state.UI.goingDown.selectedCards[index - 1]]) : getSuit(this.props.state.player.hand[this.props.state.UI.goingDown.selectedCards[index + 1]]);
                    redAces.push({
                        aceAs : {
                            suit : aceSuit,
                            value : aceValue,
                            position : index
                        },
                        original
                    });
                }
                return "remove"
            } else {
                return this.props.state.player.hand[cardNum]; //not a red ace
            }
        })
        setrun = setrun.filter (item => {
            if (item === "remove"){
                return false;
            }
            return true;
        })
        if (redAces.length > setrun.length) return;
        let result = handFunctions.checkSetrun(setrun, requirement, redAces, true);
        console.log ("check setrun result", result);
        if (!result.valid) return;
        //need to check that setrun is valid
        let setrunSubmit = {
            type : requirement.toLowerCase(),
            cards : this.props.state.UI.goingDown.selectedCards,
            redAces
        }
        this.props.goDownSubmitSetrun(setrunSubmit);
    }

    goDownSubmitHand = (event, requirement) => {
        if (requirement !== "NONE") return;
        let newHand = [...this.props.state.player.hand];
        let usedCards = [];
        let table = [];
        let counter = 0;
        let cardsArray = [];
        
   
        this.props.state.UI.goingDown.submittedSetruns.forEach((setrun, index) => {
            let redAces = setrun.redAces;
            setrun.cards.forEach((cardNum, index) => {
                usedCards.push(cardNum);
                cardsArray.push(this.props.state.player.hand[cardNum]);
            });
            table.push({
                type : setrun.type,
                cards : cardsArray,
                redAces
            });
            cardsArray = []
        })

        usedCards.sort((a,b) => b-a);

        usedCards.forEach((cardNum) => {newHand.splice(cardNum, 1)})
        this.props.goDownSubmitHand(table, newHand);
    }

    playerAddCardToTable(event, playerType, setrunIndex, AIIndex) {
    
        if (this.props.state.game.gameState !== GAME_STATES.PW_PLAY) return;
        if (this.props.state.player.cardSelected === false) return;
        if (!this.props.state.player.isDown) return;
        let setrun, newCard, newSetrun;
        let redAces = [];

        if (playerType === "player") {
            setrun = _.cloneDeep(this.props.state.player.table[setrunIndex]);
        } else if (playerType === "AI") {
            setrun = _.cloneDeep(this.props.state.AI.players[AIIndex].table[setrunIndex]);
        }
        if (!setrun) return;
        console.log("setrun selected", setrun);

        let newSetrunCards = setrun.cards.filter(card => {
            return (card === "1H" || card === "1D") ? false : true;
        });
        redAces.push(...setrun.redAces);

        newCard = this.props.state.player.hand[this.props.state.player.cardSelected];
        if (newCard === "1H" || newCard === "1D") { 
            redAces.push({
                original : {
                    value : getValue(newCard),
                    suit : getSuit(newCard)
                }
            })
        } else {
            newSetrunCards.push(newCard);
        }

        console.log("redAces for checkSetrun", redAces);
        console.log("newSetrun for checkSetrun", newSetrunCards);
        let result = handFunctions.checkSetrun(newSetrunCards, setrun.type.toUpperCase(), redAces);
        console.log("checkSetrun result", result);

        if (result.valid === false) return;

        //TODO
        //use new sorting alg.
        //pass reducer entire setrun object, not just the cards
        //need to handle ace going to player hand
        
        
        result.redAce.forEach(ace => {
            if (ace.aceToPlayer === true){
                this.props.aceToPlayer(ace.original.value + ace.original.suit);
            } else
                newSetrunCards.push(ace.original.value + ace.original.suit);
        });
        setrun.cards = newSetrunCards;
        if (setrun.type.toUpperCase() === "RUN") setrun = handFunctions.sortTableRun(setrun);
        console.log("setrun", setrun);
        this.props.playerAddCardToTable(setrun, playerType, setrunIndex, AIIndex);   

    }
    
    endRound() {
        if (this.props.state.game.gameState === GAME_STATES.ROUND_END) return;
        let points = {
            player : null,
            AI : []
        };
        points.player = (this.props.state.player.hand.length !== 0) ? handFunctions.getPoints(this.props.state.player.hand) : 0;
        this.props.state.AI.players.forEach((player, index) => {
            points.AI[index] = (player.hand.length !== 0) ? handFunctions.getPoints(player.hand) : 0;
        });
        
        this.props.endRound(points);
    }   

    startNextRound () {
        
       let deck = deckFunctions.generateDeck(2);
       let hands = deckFunctions.deal(deck, params.numberOfPlayers);
       let discard = [];
       discard.push(deck[0])
       deck.shift();

       this.props.startNextRound(deck, discard, hands);
   }

}

const mapStateToProps = state => {
    return{
        state : state
    };
}

const mapDispatchToProps = dispatch => {
    return {
        startNewGame : (deck, hands, discard) => dispatch({
            type : actions.START_NEW_GAME,
            payload : {
                deck : deck,
                hands : hands,
                discard : discard
            }
        }),
        fromDeckToPlayer : () => dispatch({
            type : actions.FROM_DECK_TO_PLAYER
        }),
        fromDiscardToPlayer : () => dispatch({
            type : actions.FROM_DISCARD_TO_PLAYER
        }),
        selectCardFromHand : (card) => dispatch({
            type : actions.SELECT_CARD_FROM_HAND,
            payload : {
                cardSelected : card
            }
        }),
        fromHandToDiscard : (cardIndex) => dispatch({
            type : actions.FROM_HAND_TO_DISCARD
        }),
        AIPickedFromDeck : () => dispatch({
            type : actions.AI_PICKED_FROM_DECK
        }),
        AIPickedFromDiscard : () => dispatch({
            type : actions.AI_PICKED_FROM_DISCARD
        }),
        AIWaitOneComplete : () => dispatch({
            type : actions.AI_WAIT_ONE_COMPLETE
        }),
        AIOOTRequests : (OOTRequests) => dispatch({
            type : actions.AI_DRAW_OOT,
            payload : {OOTRequests}
        }),
        AIWaitTwoComplete : () => dispatch({
            type : actions.AI_WAIT_TWO_COMPLETE
        }),
        playerDrawOOT : () => dispatch({
            type : actions.PLAYER_DRAW_OOT
        }),
        drawOOTResolve : (winner) => dispatch({
            type : actions.DRAW_OOT_RESOLVE,
            payload : {winner}
        }),
        fromAIToDiscard : (cardIndex) => dispatch({
            type : actions.FROM_AI_TO_DISCARD,
            payload : {cardIndex}
        }),
        updatePlayerHand : (newHand) => dispatch({
            type : actions.UPDATE_PLAYER_HAND,
            payload: {newHand}
        }),
        showGoingDownModal : () => dispatch({
            type : actions.SHOW_GOING_DOWN_MODAL
        }),
        cancelPlayerGoDown : () => dispatch({
            type : actions.CANCEL_PLAYER_GO_DOWN
        }),
        goDownSelectCard : (cardNum) => dispatch({
            type : actions.GO_DOWN_SELECT_CARD,
            payload : {cardNum}
        }),
        goDownSubmitSetrun : (setrun) => dispatch({
            type : actions.GO_DOWN_SUBMIT_SETRUN,
            payload : {setrun}
        }),
        goDownSubmitHand : (table, hand) => dispatch({
            type : actions.GO_DOWN_SUBMIT_HAND,
            payload : {table, hand}
        }),
        AIGoDownSubmit : (table, hand, discardIndex) => dispatch ({
            type : actions.AI_GO_DOWN_SUBMIT, 
            payload : {table, hand, discardIndex}
        }),
        AIAddCardToTable : (newSetrun, newHand, playerType, setrunIndex, AIIndex) => dispatch ({
            type : actions.AI_ADD_CARD_TO_TABLE,
            payload : {newSetrun, newHand, playerType, setrunIndex, AIIndex}
        }),
        playerAddCardToTable : (newSetrun, playerType, setrunIndex, AIIndex) => dispatch ({
            type : actions.PLAYER_ADD_CARD_TO_TABLE,
            payload : {newSetrun, playerType, setrunIndex, AIIndex}
        }),
        endRound : (points) => dispatch ({
            type : actions.END_ROUND,
            payload : {points}
        }),
        startNextRound : (deck, discard, hands) => dispatch({
            type : actions.START_NEXT_ROUND,
            payload : {deck, discard, hands}
        }),
        removeAIMessage : (AIIndex) => dispatch({
            type : actions.REMOVE_AI_MESSAGE,
            payload : {AIIndex}
        }),
        aceToPlayer : (aceString) => dispatch ({
            type : actions.ACE_TO_PLAYER_HAND,
            payload : {aceString}
        })

    }
}
export default connect(mapStateToProps, mapDispatchToProps)(App);
