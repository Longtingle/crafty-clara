import React, {Component} from 'react';
import {connect} from 'react-redux';
import actions from './store/actions.js';


import Hand from './containers/hand/hand.js';
import Table from './containers/table/table.js';

import {Connect} from 'react-redux';



import './App.css';

class App extends Component {

    constructor (props) {
        super(props);
    }

    render() {
        console.log(this.props.state.table.deck);
        return(
            <div className = "App">
               <Table />
            </div>
        )
    }

}

const mapStateToProps = state => {
    return{
        state : state
    };
}

const mapDispatchToProps = dispatch => {
    return {
        startNewGame : () => dispatch({
            type : actions.START_NEW_GAME
        })
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(App);
