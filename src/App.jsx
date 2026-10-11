//react/redux imports
import {Component} from 'react';
import {connect} from 'react-redux';

//import constants
import actions from './store/actions.js';
import GAME_STATES from './store/constants.js';
import {AI_CARD_SELECT, SET, RUN} from './store/constants.js';

//import helper functions
import deckFunctions from './game-functions/deck-functions.js';
import params from './game-functions/params.js';
import AIFunctions from './game-functions/AI-functions.js';
import handFunctions from './game-functions/hand-functions.js';

//import react components
import Home from './components/game/home.jsx';
import GameTable from './components/game/game-table.jsx';
import GoDownDialog from './components/game/go-down-dialog.jsx';
import RoundEndDialog from './components/game/round-end-dialog.jsx';


class App extends Component {

    // handlers the table calls; created once so the table's props stay stable
    tableActions = {
        deckClick : () => this.deckClickHandler(),
        discardClick : () => this.discardClickHandler(),
        claimDiscard : () => this.claimDiscard(),
        selectCard : (cardNum) => this.handClickHandler(cardNum),
        reorderHand : (from, to) => this.reorderHand(from, to),
        sortBySuit : () => this.sortHand(RUN),
        sortByValue : () => this.sortHand(SET),
        openGoDown : () => this.goDownClickHandler(),
        addToMeld : (playerType, setrunIndex, AIIndex) => this.playerAddCardToTable(playerType, setrunIndex, AIIndex)
    };

    render() {
        let state = this.props.state;
        if (state.game.gameState === GAME_STATES.NO_GAME) {
            return <Home onStartGame={this.newGameHandler} />;
        }
        return (
            <>
                <GameTable state={state} actions={this.tableActions} />
                <GoDownDialog
                    open={state.player.isGoingDown}
                    hand={state.player.hand}
                    requirement={state.game.requirement}
                    onCancel={this.props.cancelPlayerGoDown}
                    onSubmit={this.goDownSubmit}
                />
                <RoundEndDialog
                    open={state.UI.endOfRound}
                    round={state.game.round}
                    player={state.player}
                    AIPlayers={state.AI.players}
                    onNextRound={this.startNextRound}
                    onNewGame={this.newGameHandler}
                />
            </>
        );
    }

    // Moves a card in the hand onto another card's position.
    reorderHand(from, to) {
        if (from === to || Number.isNaN(from)) return;
        let newHand = [...this.props.state.player.hand];
        newHand.splice(to, 0, newHand.splice(from, 1)[0]);
        this.props.updatePlayerHand(newHand);
    }

    componentDidUpdate(prevProps) {
        // only state changes move the game on
        if (prevProps.state === this.props.state) return;

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

        //HALT execution here if the state change is not a gameUpdate.
        if (this.props.state.game.gameUpdate === false) return;

        if (this.props.state.game.gameState === GAME_STATES.AI_DRAW) {
            if (this.props.state.discard.length === 0) {
                this.refillDeckIfEmpty();
                this.props.AIPickedFromDeck();
                return;
            }
            let drawResult = AIFunctions.selectDraw(
                this.props.state.AI.players[this.props.state.AI.AIInPlay].hand,
                this.props.state.game.requirement,
                this.props.state.discard[0]);
            setTimeout(() => {
                if (drawResult === AI_CARD_SELECT.SELECT_DECK) {
                    this.refillDeckIfEmpty();
                    this.props.AIPickedFromDeck();
                } else {
                    this.props.AIPickedFromDiscard();
                }
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
                        if (index !== this.props.state.AI.AIInPlay){
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
            if (this.props.state.playerClaim && !this.props.state.discardCovered) {
                OOTRequests.push({type : "player", index : params.numberOfPlayers - 1});
            }
            let OOTResult = AIFunctions.resolveOOT(OOTRequests, this.props.state.AI.AIInPlay);
            this.props.drawOOTResolve(OOTResult);
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
                let AIHand = this.props.state.AI.players[this.props.state.AI.AIInPlay].hand;
                let handBuildResult = AIFunctions.AIHandBuild(AIHand, AITables, this.props.state.player.table);

                if (handBuildResult.result === false) {
                    this.props.fromAIToDiscard(AIFunctions.selectDiscard(AIHand, this.props.state.game.requirement, true));
                } else {
                    this.props.AIAddCardToTable(handBuildResult.newSetrun,handBuildResult.newHand, handBuildResult.playerType, handBuildResult.setrunIndex, handBuildResult.AIIndex)
                }
            }
        }
    }

    newGameHandler = () => { //done
        let deck = deckFunctions.generateDeck(2);
        let hands = deckFunctions.deal(deck, params.numberOfPlayers);
    
        let discard = [];
        discard.push(deck[0])
        deck.shift();
        this.props.startNewGame(deck, hands, discard);
    }

    deckClickHandler = () => { //done
        if (this.props.state.game.gameState === GAME_STATES.PW_DRAW_CARD) {
            this.refillDeckIfEmpty();
            this.props.fromDeckToPlayer();
        }
    }

    // When the deck runs out, everything but the top discard is shuffled into a new deck.
    refillDeckIfEmpty() {
        let {deck, discard} = this.props.state;
        if (deck.length > 0 || discard.length < 2) return;
        let newDeck = discard.slice(1);
        deckFunctions.shuffle(newDeck);
        this.props.reshuffleDiscard(newDeck, [discard[0]]);
    }

    discardClickHandler = () => {
        if (this.props.state.game.gameState === GAME_STATES.PW_DRAW_CARD && 
            this.props.state.discard.length > 0) {
            this.props.fromDiscardToPlayer();
        } else if ( 
            this.props.state.game.gameState === GAME_STATES.PW_PLAY && 
            this.props.state.player.cardSelected !== null && 
            !this.props.state.player.isGoingDown
        ){
            this.props.fromHandToDiscard();
        } else {
            this.claimDiscard();
        }
    }

    // The human can claim the top discard out of turn once the AI in play has
    // drawn from the deck, until the claims are resolved.
    claimDiscard() {
        let state = this.props.state;
        let claimWindow = [GAME_STATES.AI_WAIT_ONE, GAME_STATES.AI_DRAW_OOT, GAME_STATES.AI_WAIT_TWO]
            .includes(state.game.gameState);
        if (claimWindow && !state.discardCovered && state.discard.length > 0 && !state.playerClaim) {
            this.props.playerDrawOOT();
        }
    }

    handClickHandler = (cardNum) => {
        if (this.props.state.game.gameState === GAME_STATES.PW_PLAY && this.props.state.player.isGoingDown === false) {
            //we're not in going down mode, so get the card selected ready for going onto the table or going onto the discard.
            this.props.selectCardFromHand(cardNum);
        }
    }

    sortHand(type) {
        this.props.updatePlayerHand(handFunctions.sortHand(this.props.state.player.hand, type));
    }

    goDownClickHandler = () => {
        if (this.props.state.player.isDown) return;
        if (this.props.state.game.gameState !== GAME_STATES.PW_PLAY) return;
        this.props.showGoingDownModal();
    }

    // slots: [{type, indices}] from the go-down dialog, one per setrun the round needs
    goDownSubmit = (slots) => {
        let hand = this.props.state.player.hand;
        let table = [];
        for (let slot of slots) {
            let result = handFunctions.checkSetrun(slot.indices.map(index => hand[index]), slot.type);
            if (!result.valid) return;
            handFunctions.insertBuildOptions(result.setrun);
            table.push(result.setrun);
        }
        let usedCards = slots.flatMap(slot => slot.indices);
        let newHand = hand.filter((card, index) => !usedCards.includes(index));
        this.props.goDownSubmitHand(table, newHand);
    }

    playerAddCardToTable(playerType, setrunIndex, AIIndex) {

        if (this.props.state.game.gameState !== GAME_STATES.PW_PLAY) return;
        if (this.props.state.player.cardSelected === null) return;
        if (!this.props.state.player.isDown) return;

        let setrun = (playerType === "player") ?
            this.props.state.player.table[setrunIndex] :
            this.props.state.AI.players[AIIndex].table[setrunIndex];
        if (!setrun) return;

        let newCard = this.props.state.player.hand[this.props.state.player.cardSelected];
        let result = handFunctions.addToSetrun(setrun, newCard);
        if (!result.valid) return;

        this.props.playerAddCardToTable(result.setrun, playerType, setrunIndex, AIIndex, result.returnedAce);
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

    startNextRound = () => {
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
        playerAddCardToTable : (newSetrun, playerType, setrunIndex, AIIndex, returnedAce) => dispatch ({
            type : actions.PLAYER_ADD_CARD_TO_TABLE,
            payload : {newSetrun, playerType, setrunIndex, AIIndex, returnedAce}
        }),
        reshuffleDiscard : (deck, discard) => dispatch({
            type : actions.RESHUFFLE_DISCARD,
            payload : {deck, discard}
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
        })
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(App);
