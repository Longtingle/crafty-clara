import React from 'react';
import './hand.css';
import Card from '../card/card.js';

var Hand = function (props) {
    return (
        <div className = "hand">
            <Card cardName = "1C" zIndex = "2"/>
            <Card cardName = "2C" zIndex = "1"/>
            <Card cardName = "3C"/>
            <Card cardName = "4C"/>
            <Card cardName = "8H"/>
            <Card cardName = "8D"/>
            <Card cardName = "8S"/>
            <Card cardName = "1H"/>
            <Card cardName = "13C"/>
            <Card cardName = "5C"/>
            <Card cardName = "4C"/>
            <Card cardName = "5C"/>
        </div>
    );
}

export default Hand;