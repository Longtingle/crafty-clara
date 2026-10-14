import type {Card} from '@/engine/cards.ts';
import {addToSetrun} from '@/engine/setruns.ts';
import {shortName, longName, requirementText} from '@/engine/card-names.ts';
import type {GameView} from '@/engine/view.ts';

// What you can do right now, worked out from your view of the game and your
// hand as you've arranged it. The table shows it (game-table.tsx), and
// GameScreen turns what you do into commands.

/** What the selected card would do on a setrun on the table. */
export interface MeldTarget {
    /** "Add 7♦", or "Swap for A♥" */
    label: string;
    /** whose setrun it is, for the turn prompt: "your run", "Opponent 2's set" */
    owner: string;
    /** the wild ace the card would replace, which comes back to your hand */
    returnedAce: Card | null;
}

export interface TurnStep {
    label: string;
    state: "done" | "current" | "todo";
}

/** What clicking the discard pile does: take its top card, or discard the selected card. */
export interface PileMove {
    move: "take" | "discard";
    /** the tag on the pile */
    chip: string;
    /** for screen readers */
    label: string;
}

export interface YourTurn {
    /** it's your turn and you haven't drawn yet */
    drawing: boolean;
    /** it's your turn and you have drawn */
    playing: boolean;
    /** the selected card and its place in your hand, while you can play it */
    selected: {card: Card; index: number} | null;
    /** what the selected card would do on each setrun on the table, by seat and then setrun */
    targets: (MeldTarget | null)[][];
    /** for each card in your hand: whether it fits a setrun on the table, once you're down */
    playable: boolean[];
    /** whether you can draw from the deck */
    deckLive: boolean;
    discardPile: PileMove | null;
    goDown: {
        /** whether the go-down dialog can open */
        enabled: boolean;
        hint: string;
    };
    /** the steps of your turn, or null when it isn't your turn */
    steps: TurnStep[] | null;
    prompt: string;
    /** the prompt in a few words, for the status line on a phone */
    brief: string;
}

/** Whether a seat is taking its turn: drawing, or playing after drawing. */
export const isInTurn = (view: GameView, seat: number): boolean =>
    view.turn === seat && (view.phase === "draw" || view.phase === "play");

// The turn prompt: which step of your turn you're on, and what to do next,
// with a brief version for phones. It never says whether you can go down:
// spotting that is part of the game.
const describeTurn = (view: GameView, selected: Card | null, targets: MeldTarget[], playable: boolean[]):
    {steps: TurnStep[] | null; prompt: string; brief: string} => {
    let me = view.seats[view.seat];
    let {discard, claim} = view;
    let middle = me.isDown ? "Add to melds" : "Go down";

    if (view.phase === "roundEnd" || view.phase === "gameEnd") return {steps : null, prompt : "Round over.", brief : "Round over"};

    if (view.turn === view.seat && view.phase === "draw") {
        let text, brief;
        if (!view.deck.canDraw) {
            text = "The deck is empty. Take the " + shortName(discard[0]) + ".";
            brief = "The deck is empty: take the " + shortName(discard[0]);
        } else if (discard.length > 0) {
            text = "Draw from the deck or take the " + shortName(discard[0]) + ".";
            brief = "draw, or take the " + shortName(discard[0]);
        } else {
            text = "Draw from the deck.";
            brief = "draw a card";
        }
        let starting = view.log.length === 0;
        return {
            steps : [{label : "Draw", state : "current"}, {label : middle, state : "todo"}, {label : "Discard", state : "todo"}],
            prompt : (starting ? "You start this round. " : "Your turn. ") + text,
            brief : view.deck.canDraw ? (starting ? "You start: " : "Your turn: ") + brief : brief
        };
    }

    if (view.turn === view.seat) {
        let steps: TurnStep[] = [
            {label : "Draw", state : "done"},
            {label : middle, state : selected ? "todo" : "current"},
            {label : "Discard", state : selected ? "current" : "todo"}
        ];
        let swap = targets.find(target => target.returnedAce);
        let prompt, brief;
        if (claim && !(selected && targets.length > 0)) {
            // you can't discard until the others have claimed or passed
            prompt = "Waiting to see if anyone claims the " + shortName(claim.card) + ".";
            brief = "Waiting to see if anyone claims the " + shortName(claim.card);
        } else if (!selected) {
            if (me.isDown) {
                prompt = "Select a card to add to a meld or discard." +
                    (playable.some(Boolean) ? " Gold dots mark cards that fit." : "");
                brief = "Pick a card to add to a meld or discard";
            } else {
                prompt = "Select a card to discard. To go down you need " + requirementText(view.requirement) + ".";
                brief = "Pick a card to discard";
            }
        } else if (swap) {
            prompt = shortName(selected) + " can replace the wild " + shortName(swap.returnedAce!) + " in " + swap.owner +
                ", and the ace comes back to you.";
            brief = "Swap " + shortName(selected) + " for the wild " + shortName(swap.returnedAce!) + ", or discard it";
        } else if (targets.length > 0) {
            prompt = "Add " + shortName(selected) + " to a highlighted meld, or discard it to end your turn.";
            brief = "Add " + shortName(selected) + " to a gold meld, or discard it";
        } else if (me.isDown) {
            prompt = shortName(selected) + " doesn't fit any meld. Discard it to end your turn.";
            brief = shortName(selected) + " fits no meld: discard it";
        } else {
            prompt = "Discard " + shortName(selected) + " to end your turn, or pick another card.";
            brief = "Discard " + shortName(selected) + " to end your turn";
        }
        return {steps, prompt, brief};
    }

    let name = view.seats[view.turn].name;
    if (claim?.canAnswer) {
        return {
            steps : null,
            prompt : name + " drew from the deck. Claim the " + shortName(claim.card) + ", or pass?",
            brief : "Claim the " + shortName(claim.card) + ", or pass?"
        };
    }
    if (view.log.length === 0) return {steps : null, prompt : name + " starts this round.", brief : name + " starts this round"};
    return {steps : null, prompt : name + " is playing.", brief : name + " is playing"};
}

/** What you can do now. selectedIndex is the selected card's place in your hand. */
export const yourTurn = (view: GameView, hand: Card[], selectedIndex: number | null): YourTurn => {
    let me = view.seats[view.seat];
    let myTurn = isInTurn(view, view.seat);
    let drawing = myTurn && view.phase === "draw";
    let playing = myTurn && view.phase === "play";
    let building = playing && me.isDown;
    let selected = (playing && selectedIndex !== null && hand[selectedIndex])
        ? {card : hand[selectedIndex], index : selectedIndex}
        : null;

    let targets = view.seats.map((player, seat) => player.table.map((setrun): MeldTarget | null => {
        if (!building || !selected) return null;
        let result = addToSetrun(setrun, selected.card);
        if (!result.valid) return null;
        let owner = ((seat === view.seat) ? "your " : player.name + "'s ") + setrun.type.toLowerCase();
        return result.returnedAce
            ? {label : "Swap for " + shortName(result.returnedAce), owner, returnedAce : result.returnedAce}
            : {label : "Add " + shortName(selected.card), owner, returnedAce : null};
    }));
    let allSetruns = view.seats.flatMap(player => player.table);
    let playable = hand.map(card => building && allSetruns.some(setrun => addToSetrun(setrun, card).valid));

    let discardPile: PileMove | null = null;
    if (drawing && view.discard.length > 0) {
        discardPile = {move : "take", chip : "Take", label : "Take " + longName(view.discard[0])};
    } else if (selected && !view.claim) {
        discardPile = {
            move : "discard",
            chip : "Discard " + shortName(selected.card),
            label : "Discard " + longName(selected.card) + " and end your turn"
        };
    }

    let hint;
    if (me.isDown) hint = "You're down this round";
    else if (drawing) hint = "Draw a card first";
    else if (!myTurn) hint = "You can go down on your turn";
    else hint = "Need " + requirementText(view.requirement);

    let fits = targets.flat().filter(target => target !== null);
    return {
        drawing,
        playing,
        selected,
        targets,
        playable,
        deckLive : drawing && view.deck.canDraw,
        discardPile,
        goDown : {enabled : playing && !me.isDown, hint},
        ...describeTurn(view, selected?.card ?? null, fits, playable)
    };
};
