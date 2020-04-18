import React, {Component} from 'react';
import {connect} from 'react-redux';
import actions from './store/actions.js';
import GAME_STATES from './store/constants.js';
import generateDeck from './game-functions/deck-functions.js';

import Hand from './containers/hand/hand.js';
import Table from './containers/table/table.js';




import './App.css';

class App extends Component {

    constructor (props) {
        super(props);
    }

    render() {
        let output;
        if (this.props.state.game.gameState === GAME_STATES.NO_GAME) {
            output = (
                <button onClick = {this.newGameHandler}>
                    START NEW GAME
                </button>    
            );
        }
        return(
            <div className = "App">
               <Table />
               {output}
            </div>
        )
    }

    newGameHandler = () => {
        let cards = generateDeck(2);
        this.props.startNewGame(cards);
    }
}

const mapStateToProps = state => {
    return{
        state : state
    };
}

const mapDispatchToProps = dispatch => {
    return {
        startNewGame : (cards) => dispatch({
            type : actions.START_NEW_GAME,
            payload : {
                cards : cards
            }
        })
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(App);
