//react/redux imports
import React, {Component} from 'react';
import {connect} from 'react-redux';

//import constants
import actions from './store/actions.js';
import GAME_STATES from './store/constants.js';
import {AI_STAGES} from './store/constants.js';
import {AI_CARD_SELECT} from './store/constants.js';

//import helper functions
import deckFunctions from './game-functions/deck-functions.js';
import params from './game-functions/params.js';
import AIFunctions from './game-functions/AI-functions.js';

//import react/css components
import Table from './containers/table/table.js';
import Home from './ui/home/home.js';
import './App.css';


class App extends Component {
    
    playerOOTRequest = null;

    constructor (props) {
        super(props);
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
                    <Table
                        deckClickHandler = {this.deckClickHandler}
                        handClickHandler = {this.handClickHandler}
                        discardClickHandler = {this.discardClickHandler}
                        state = {this.props.state}
                    />
                </div>
            )
        }
            
        return(
            output
        );
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
        if (this.props.state.game.gameState === GAME_STATES.PW_DRAW_CARD) {
            this.props.fromDiscardToPlayer();
        } else if ( 
            this.props.state.game.gameState === GAME_STATES.PW_PLAY && 
            this.props.state.player.cardSelected && 
            !this.props.state.player.isGoingDown
        ){
            let OOTResult = AIFunctions.resolveOOT(this.props.state.OOTRequests, this.props.state.AI.AIInPlay);
            console.log(OOTResult);
            if (OOTResult.winnerType !== "none") {
                this.props.drawOOTResolve(OOTResult);
            }
            this.props.fromHandToDiscard();
        } else if (this.props.state.game.gameState !== GAME_STATES.PW_PLAY && 
            this.props.state.game.gameState !== GAME_STATES.PW_DRAW_CARD){
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

    componentDidUpdate() {
        console.log("componentDidUpdate:");
        console.log("AI IN PLAY: " + this.props.state.AI.AIInPlay + "  - GAMESTATE : " + this.props.state.game.gameState);
        //If the state show that the active AI needs to draw a card, then trigger that action.

        if (this.props.state.game.gameState === GAME_STATES.AI_DRAW) { 
            let drawResult = AIFunctions.selectDraw(
                this.props.state.AI.players[this.props.state.AI.AIInPlay].hand, 
                this.props.state.game.requirement, 
                this.props.state.discard[0]);

            (drawResult === AI_CARD_SELECT.SELECT_DECK) ? this.props.AIPickedFromDeck() : this.props.AIPickedFromDiscard();

            return;
        }

        //If the state shows that the active AI needs to wait, trigger that action.
        if (this.props.state.game.gameState === GAME_STATES.AI_WAIT_ONE) {
            setTimeout(() => {this.props.AIWaitOneComplete()}, 1500);
            return;
        }

        if (this.props.state.game.gameState === GAME_STATES.AI_DRAW_OOT) {
            //generate draw OOT requests.
            let OOTRequests = [];
            this.props.state.AI.players.forEach((player, index) => {
                if (AIFunctions.drawOOT(player.hand, this.props.state.game.requirement, this.props.state.discard[0])) {
                    if (player.index !== this.props.state.AI.AIInPlay){
                        OOTRequests.push({type : "AI", index}) ;       
                    }
                }
            });
            this.props.AIOOTRequests(OOTRequests);
            return;
        }

        if (this.props.state.game.gameState === GAME_STATES.AI_WAIT_TWO) {
            setTimeout(() => {this.props.AIWaitTwoComplete()}, 1500);
            return;
        }

        if (this.props.state.game.gameState === GAME_STATES.AI_OOT_RESOLVE) {
            

            let OOTRequests = [...this.props.state.OOTRequests];
            console.log(OOTRequests);
            if (this.playerOOTRequest) OOTRequests.push(this.playerOOTRequest);
            console.log(OOTRequests);
            let OOTResult = AIFunctions.resolveOOT(OOTRequests, this.props.state.AI.AIInPlay);
            console.log(OOTResult);
            this.props.drawOOTResolve(OOTResult);
            this.playerOOTRequest = null;
            return;
        }

        if (this.props.state.game.gameState === GAME_STATES.AI_PLAY) {
            
            if (AIFunctions.canGoDown(this.props.state.AI.players[this.props.state.AI.AIInPlay].hand, this.props.state.game.requirement)){
                //can go down
            }else {
                //can't go down, discard.                
                let discardIndex = AIFunctions.selectDiscard(this.props.state.AI.players[this.props.state.AI.AIInPlay].hand, this.props.state.game.requirement);
                this.props.fromAIToDiscard(discardIndex);
            }
            return;
        }
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
        })
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(App);
