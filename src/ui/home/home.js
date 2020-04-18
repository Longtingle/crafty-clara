import React from 'react';
import './home.css';

var Home = function (props) {
    return (
        <div className = "home-container">
            <div className = "header">
                <div className = "intro">
                    Welcome to.....
                </div>
                <div className = "title">
                    Crafty Clara
                </div>
                <div className = "tag">
                    (or something like that)
                </div>
            </div>
            <div className = "start-button-container">
                <div 
                    className = "start-button" 
                    onClick = {props.startGameHandler}
                >
                    Start Game
                </div> 
            </div>
        </div>
    );
}

export default Home