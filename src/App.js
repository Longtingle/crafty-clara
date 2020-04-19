import React, {Component} from 'react';
import {connect} from 'react-redux';
import actions from './store/actions.js';
import GAME_STATES from './store/constants.js';
import deckFunctions from './game-functions/deck-functions.js';
import objAI from './game-functions/AI.js';
import params from './game-functions/params.js';

import Table from './containers/table/table.js';
import Home from './ui/home/home.js';



import './App.css';

class App extends Component {

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
        let deck = deckFunctions.generateDeck(2);
        console.log("DECK GENERATED");
        let hands = deckFunctions.deal(deck, params.numberOfPlayers);
        
        let AI = []
        for (let i = 0; i < params.numberOfPlayers - 1 ; i++){
            AI.push(new objAI(hands[i+1]));
        }
        let discard = [];
        discard.push(deck[0])
        deck.shift();
        this.props.startNewGame(deck, hands, AI, discard);
    }

    deckClickHandler = () => {
        if (this.props.state.game.gameState === GAME_STATES.PW_DRAW_CARD) {
            this.props.fromDeckToPlayer();
        }
    }

    discardClickHandler = () => {
        if (this.props.state.game.gameState === GAME_STATES.PW_DRAW_CARD || this.props.state.game.gameState === GAME_STATES.PW_DRAW_OOT) {
            this.props.fromDiscardToPlayer();
        }

    }

    handClickHandler = (event) => { 
        console.log(event.target.class);
        if (this.props.state.player.isGoingDown === false) {
            //we're not in going down mode, so get the card selected ready for going onto the table or going onto the discard.
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
        startNewGame : (deck, hands, AI, discard) => dispatch({
            type : actions.START_NEW_GAME,
            payload : {
                deck : deck,
                hands : hands,
                AI : AI,
                discard : discard
            }
        }),
        fromDeckToPlayer : () => dispatch({
            type : actions.FROM_DECK_TO_PLAYER
        }),
        fromDiscardToPlayer : () => dispatch({
            type : actions.FROM_DISCARD_TO_PLAYER
        })
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(App);
