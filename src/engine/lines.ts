// What the cast say at the table (talk.ts decides when). Each character has
// their own lines for each moment, in their own voice. A line names who it's
// said to only as {name} (or {dealer}), and only to address them: "Get you,
// {name}." or "{dealer}, did you shuffle?". Said to you, the name is left out.
// {card} is a card, as "7♦". A line can carry the answers written for it.

import type {CharacterId} from './cast.ts';

export type Moment =
    // as the cards are dealt: about their hand, true or not, or blaming the dealer
    | "dealGood" | "dealBad" | "dealBlame"
    // the dealer, blamed
    | "dealer"
    // during the round, about their hand, true or not; or giving nothing away
    | "handGood" | "handBad" | "handCoy"
    // not believing someone's talk about their hand
    | "doubt"
    | "downSelf" | "downOther"
    // someone goes down with a long run or a big set
    | "downBig"
    // answering a remark made at them
    | "comeback"
    | "claimSelf" | "claimOther" | "tookDiscard"
    // a claim they got ahead of someone who asked for it too
    | "wonClaim"
    // someone adds a card to their setrun
    | "addedToMine"
    // someone shows a red ace: laid down, added, claimed or taken
    | "redAce"
    | "reshuffle"
    | "outSelf" | "outOther"
    // someone else went out, and they were caught with a lot of points
    | "caught"
    // the deck ran out, and nobody went out
    | "deckOut"
    | "wonGame" | "lostGame"
    // at one of Chris's puns
    | "groan";

/** A line, and the answers written for it in particular. */
export type Written = string | {text: string; replies: string[]};

export type Repertoire = Partial<Record<Moment, Written[]>>;

export const LINES: Record<CharacterId, Repertoire> = {
    clara : {
        dealGood : [
            "Ooh, now this is promising.",
            "I could get used to hands like this.",
            "Well, well. Somebody likes me today."
        ],
        dealBad : [
            "Oh dear. Oh dear, oh dear.",
            "Lovely cards. For somebody else.",
            "Don't mind me. I'll just be over here, losing.",
            "I'd give this hand back, if they'd take it."
        ],
        dealBlame : [
            "{dealer}, did you shuffle these or just stir them?",
            "Who dealt this? Oh, {dealer}. Of course.",
            "Thank you, {dealer}. I'll treasure every one of these duds."
        ],
        dealer : [
            "Don't blame me, {name}. I only hand them out.",
            "You're welcome, {name}.",
            "Funny, my hand looks lovely."
        ],
        handGood : [
            "Not long now.",
            "I can almost taste it.",
            "I'd start worrying, if I were you."
        ],
        handBad : [
            "Don't mind me. I'm miles off.",
            "I'm nowhere near. Honestly.",
            "Hopeless. Absolutely hopeless.",
            "Somebody pass the tissues. This hand's a tragedy."
        ],
        handCoy : [
            "My lips are sealed.",
            "I'm saying nothing."
        ],
        doubt : [
            "Of course you are, {name}.",
            "Mm-hm. And I'm the Queen of Sheba.",
            "Pull the other one, {name}."
        ],
        downSelf : [
            "Oh, did I forget to mention I was close?",
            "Surprise.",
            "Sorry, was I supposed to warn you?"
        ],
        downOther : [
            "Get you, {name}.",
            "And there it is.",
            "Showing your hand already, {name}? Brave."
        ],
        downBig : [
            "Ooh, look at that. Somebody's been busy.",
            "My, my. That's a lot of cards, {name}.",
            "Ooh. Hoarding, were we?"
        ],
        comeback : [
            "Jealous, {name}?",
            "I'll take that as a compliment.",
            "Says you, {name}."
        ],
        claimSelf : [
            "Don't mind if I do.",
            "Mine, I think."
        ],
        claimOther : [
            "Oh, help yourself, {name}.",
            "I was going to take that. Probably."
        ],
        wonClaim : [
            "Sorry, {name}. First in line, I'm afraid.",
            "Was that yours, {name}? Not any more."
        ],
        tookDiscard : [
            "Thank you, that'll do nicely.",
            "The {card}? How thoughtful."
        ],
        addedToMine : [
            "Make yourself at home, {name}.",
            "Oh, please. Decorate my cards."
        ],
        redAce : [
            "Another red ace, {name}? Who are you paying off?",
            "That's a lot of red aces for one person, {name}."
        ],
        reshuffle : [
            "Round and round we go.",
            "Same rubbish, new order."
        ],
        outSelf : [
            "That's me. Pencils ready?",
            "Oops. Was I meant to wait?",
            "And that's how it's done."
        ],
        outOther : [
            "Well played, {name}. I suppose.",
            "Already? Rude."
        ],
        caught : [
            "Ouch. Write that down quietly.",
            "I'd like that score in pencil, please.",
            "Don't look at my total. Nobody look."
        ],
        deckOut : [
            "Well, that was a waste of everyone's time.",
            "Nobody? Not one of us? Marvellous."
        ],
        wonGame : [
            "Crafty by name...",
            "Thank you, thank you. Same time next week?"
        ],
        lostGame : [
            "I let you win. Obviously.",
            "Next time I'm actually trying."
        ],
        groan : [
            "Chris. No.",
            "Somebody take Chris's cards away."
        ]
    },

    alan : {
        dealGood : [
            "Huh. That's a first.",
            "Well, this won't last.",
            "Something's wrong. This is half decent."
        ],
        dealBad : [
            "I've got a hand like a foot.",
            "Rubbish. Every one of them.",
            "Why do I bother?",
            "Look at this. Just look at it."
        ],
        dealBlame : [
            "Who dealt this rubbish? I've got a hand like a foot.",
            "{dealer}, have you got something against me?",
            "Cheers, {dealer}. Really. Cheers."
        ],
        dealer : [
            "Don't look at me, {name}. I've got the same rubbish.",
            "I just deal them, {name}. I don't make them.",
            "You think yours is bad?"
        ],
        handGood : [
            "Don't get excited, but I'm nearly there.",
            "Close. Which means something'll go wrong.",
            "Two more and I'm away. Never happens, though."
        ],
        handBad : [
            "I'm nowhere. Absolutely nowhere.",
            "Going backwards, I am.",
            "Same hand like a foot. Different toes.",
            {text : "That's it, I'm capitulating.", replies : ["Well, if you do, you'll clean it up."]}
        ],
        handCoy : [
            "Don't ask.",
            "Don't even ask."
        ],
        doubt : [
            "Course you are, {name}.",
            "Yeah, yeah.",
            "That's what you said last time, {name}."
        ],
        downSelf : [
            "Finally. Took long enough.",
            "Down. Don't all clap at once.",
            "About time something went my way."
        ],
        downOther : [
            "Typical. Course you are, {name}.",
            "Oh, here we go.",
            "Great. Brilliant. Lovely for you, {name}."
        ],
        downBig : [
            "How have you got all those, {name}?",
            "Leave some for the rest of us, {name}."
        ],
        comeback : [
            "Easy for you to say, {name}.",
            "Don't start, {name}."
        ],
        claimSelf : [
            "Mine. Finally something's mine.",
            "I'm having that."
        ],
        claimOther : [
            "I wanted that, {name}.",
            "Course. Course you did."
        ],
        wonClaim : [
            "Ha! First in line, for once.",
            "Not this time, {name}. Mine."
        ],
        tookDiscard : [
            "I'll have that, thanks.",
            "Better than what's in the deck."
        ],
        addedToMine : [
            "Oi. Get your own, {name}.",
            "Woah, steady there!"
        ],
        redAce : [
            "Another red ace, {name}? Unbelievable.",
            "How many of those have you got, {name}?"
        ],
        reshuffle : [
            "Same cards, same misery.",
            "Shuffling won't help me."
        ],
        outSelf : [
            "Ha! Didn't see that coming, did you?",
            "Out. Finally. Write it down before it changes."
        ],
        outOther : [
            "Course it's you, {name}.",
            "Typical."
        ],
        caught : [
            "Look at all this. Unbelievable.",
            "That's a whole pension's worth of points.",
            "Don't. Just don't."
        ],
        deckOut : [
            "Nobody? Typical.",
            "Well, that was pointless."
        ],
        wonGame : [
            "Well, well. I won. Somebody check the cards.",
            "Won. Mark the date."
        ],
        lostGame : [
            "Same as always.",
            "Rigged. The whole thing's rigged."
        ],
        groan : [
            "Oh, give over, Chris.",
            "That's terrible, Chris."
        ]
    },

    julie : {
        dealGood : [
            "Oh, lovely. These will do nicely.",
            "What a nice hand. Thank you, everyone."
        ],
        dealBad : [
            "Oh dear. Never mind.",
            "Not my best, but we'll see."
        ],
        dealBlame : [
            "{dealer}, sweetheart, what did I ever do to you?",
            "Thank you, {dealer}. I'll remember this."
        ],
        dealer : [
            "Sorry, love. Luck of the draw.",
            "Oh, I'm sure they'll come good, {name}."
        ],
        handGood : [
            "Nearly there, I think.",
            "Getting there, slowly but surely."
        ],
        handBad : [
            "Oh, I'm a long way off, I'm afraid.",
            "Still waiting on a few, love."
        ],
        handCoy : [
            "We'll see, won't we?"
        ],
        doubt : [
            "Oh, I'm sure you are, {name}.",
            "Course you are, love."
        ],
        downSelf : [
            "Sorry, everyone. Just going down.",
            "Oh, look at that. I'm down.",
            "Hope nobody minds."
        ],
        downOther : [
            "Well done, {name}! Lovely.",
            "Ooh, good for you, {name}."
        ],
        downBig : [
            "Ooh, aren't you clever, {name}!",
            "Look at all those! Well done, love."
        ],
        comeback : [
            "Oh, thank you, {name}. You're too kind.",
            "Bless you, {name}."
        ],
        claimSelf : [
            "Oh, is that for me? How lovely.",
            "Thank you, I'll take that."
        ],
        claimOther : [
            "Oh, have it, {name}. I didn't want it anyway.",
            "Of course, love. You have it."
        ],
        wonClaim : [
            "Oh, sorry, {name}. I was first, love.",
            "Sorry, {name}! The next one's yours, I'm sure."
        ],
        tookDiscard : [
            "Ooh, just what I wanted.",
            "Lovely, thank you."
        ],
        addedToMine : [
            "Oh, help yourself, {name}. That's what it's there for.",
            "Feel free, love."
        ],
        redAce : [
            "Another red ace? Lucky you, {name}.",
            "Oh, you've got all the luck, {name}."
        ],
        reshuffle : [
            "Ooh, fresh cards.",
            "Let's see what's in there now."
        ],
        outSelf : [
            "Oh! I'm out. Sorry, everyone.",
            "That's me done. Sorry, loves.",
            "Oops. Out. Points, please!"
        ],
        outOther : [
            "Well done, {name}! I think.",
            "Oh, lovely. Well played."
        ],
        caught : [
            "Oh dear. That's rather a lot.",
            "Never mind. Next round."
        ],
        deckOut : [
            "Nobody? Oh well. Lovely game anyway."
        ],
        wonGame : [
            "Oh! Did I win? How lovely.",
            "Thank you all. That was ever so nice."
        ],
        lostGame : [
            "Well done, everyone. Lovely game.",
            "Never mind. I'll get you next time."
        ],
        groan : [
            "Oh, Chris.",
            "Very good, Chris. Very... good."
        ]
    },

    steve : {
        dealGood : [
            "Oh, this is too easy.",
            "Might as well hand me the points now.",
            "Get the kettle on. This won't take long."
        ],
        dealBad : [
            "Not ideal. I'll still win.",
            "Bit of a challenge. I like a challenge."
        ],
        dealBlame : [
            "{dealer}, you're doing me no favours. Not that I need them.",
            "Nice try, {dealer}. Still winning."
        ],
        dealer : [
            "Skill, {name}. You'll need some.",
            "Bad workmen blame their dealers."
        ],
        handGood : [
            "Two cards. Maybe one.",
            "You lot might want to hurry up.",
            "Practically done here."
        ],
        handBad : [
            "Even when it's bad, it's good.",
            "Fine. I'm a bit off. For now."
        ],
        handCoy : [
            "Watch and learn."
        ],
        doubt : [
            "Sure you are, {name}.",
            "Bless, {name}. Keep telling yourself that."
        ],
        downSelf : [
            "And that is how it's done.",
            "Down. Obviously.",
            "Take notes, everyone."
        ],
        downOther : [
            "Took your time, {name}.",
            "Cute, {name}."
        ],
        downBig : [
            "Not bad, {name}. Not as good as mine'll be.",
            "Ooh, someone's trying to impress me."
        ],
        comeback : [
            "You wish, {name}.",
            "Jealousy's not a good look, {name}."
        ],
        claimSelf : [
            "Too slow!",
            "Mine. Thank you very much."
        ],
        claimOther : [
            "Enjoy it, {name}. You'll need it.",
            "Have that one. I'm feeling generous."
        ],
        wonClaim : [
            "Better luck next time, {name}.",
            "First in line, {name}. Story of my life."
        ],
        tookDiscard : [
            "Cheers. Exactly what I needed.",
            "Lovely little {card}."
        ],
        addedToMine : [
            "Building on greatness, {name}? Smart.",
            "Careful with that, {name}. It's a masterpiece."
        ],
        redAce : [
            "Red aces won't save you, {name}.",
            "Lean on those aces, {name}. You'll need them."
        ],
        reshuffle : [
            "Fresh deck, same winner."
        ],
        outSelf : [
            "Out! Thank you, goodnight.",
            "Was there ever any doubt?",
            "Too easy."
        ],
        outOther : [
            "Lucky, {name}. Very lucky.",
            "Beginner's luck, {name}."
        ],
        caught : [
            "That's... fine. I'm letting you all catch up.",
            "Tactical. Very tactical."
        ],
        deckOut : [
            "Nobody? Not even me? Weird."
        ],
        wonGame : [
            "Champion. Again.",
            "Autographs later, everyone."
        ],
        lostGame : [
            "I was going easy on you.",
            "Rematch. Now."
        ],
        groan : [
            "Mate. No.",
            "Chris, that's not even a joke."
        ]
    },

    gemma : {
        dealGood : [
            "Good hand.",
            "Not bad. Not bad at all."
        ],
        dealBad : [
            "This is rubbish.",
            "Terrible. Just terrible."
        ],
        dealBlame : [
            "Who dealt this rubbish?",
            "Seriously, {dealer}?"
        ],
        dealer : [
            "I deal them, {name}. I don't pick them.",
            "Moan at the cards, not me."
        ],
        handGood : [
            "Nearly there.",
            "One more card."
        ],
        handBad : [
            "Nowhere near.",
            "This isn't going well."
        ],
        handCoy : [
            "Not saying."
        ],
        doubt : [
            "Heard that before, {name}.",
            "No you're not.",
            "Rubbish, {name}."
        ],
        downSelf : [
            "Down.",
            "There. Done."
        ],
        downOther : [
            "Already, {name}?",
            "Fine."
        ],
        downBig : [
            "Show-off.",
            "That's just greedy, {name}."
        ],
        comeback : [
            "Whatever, {name}.",
            "Get on with it, {name}."
        ],
        claimSelf : [
            "Mine.",
            "I'll have that."
        ],
        claimOther : [
            "Fine. Take it, {name}.",
            "That was mine, {name}."
        ],
        wonClaim : [
            "Mine, {name}. I was first.",
            "Tough, {name}."
        ],
        tookDiscard : [
            "Ta.",
            "I'll have the {card}."
        ],
        addedToMine : [
            "Hands off, {name}.",
            "Oi. That's mine, {name}."
        ],
        redAce : [
            "Another red ace? Who are you paying off, {name}?",
            "That's not fair, {name}."
        ],
        reshuffle : [
            "Here we go again."
        ],
        outSelf : [
            "Out. Count 'em up.",
            "Done. Your turn to suffer."
        ],
        outOther : [
            "Fine. Well played, {name}.",
            "Already? Fine."
        ],
        caught : [
            "Brilliant. Loads of points.",
            "That hurt."
        ],
        deckOut : [
            "Waste of a round."
        ],
        wonGame : [
            "Won. Told you.",
            "Good game. I won."
        ],
        lostGame : [
            "Rubbish game.",
            "Fine. Next time."
        ],
        groan : [
            "No, Chris.",
            "Stop it, Chris."
        ]
    },

    chris : {
        dealGood : [
            "I'm suited to this hand.",
            "This is a big deal. Get it? Big deal?",
            "Things are looking ace."
        ],
        dealBad : [
            "I'm not playing with a full deck here.",
            "This hand is a real heartbreaker.",
            "Talk about being dealt a bad hand. Literally."
        ],
        dealBlame : [
            "{dealer}, this deal's no big deal. In a bad way.",
            "{dealer}, you've dealt me a club to the head."
        ],
        dealer : [
            "Deal with it, {name}.",
            "Don't shoot the dealer, {name}. I'm only the messenger."
        ],
        handGood : [
            "I'm on a run here. Well, nearly.",
            "I've nearly got this set. Pun intended.",
            "The spade work's nearly done."
        ],
        handBad : [
            "My hand's in tatters. Card-iac arrest.",
            "I'm all at sea. Sea? C? Never mind."
        ],
        handCoy : [
            "That's for me to know and you to find out. Ace-ually."
        ],
        doubt : [
            "Is that so, {name}? Sounds like a bit of a bluff-shuffle.",
            "Pull the other one, {name}. It's got bells on."
        ],
        downSelf : [
            "Down! Like a lead balloon, but in a good way.",
            "I'm going down. Down, down, deeper and down.",
            "Set and match!"
        ],
        downOther : [
            "On a run, are we, {name}?",
            "All set, are we, {name}?"
        ],
        downBig : [
            "Now that's a long run, {name}. Marathon, almost.",
            "Ooh, that's a big deal, {name}."
        ],
        comeback : [
            "I'll take that on the chin. And the other chin.",
            "No need to get cross, {name}. Or clubs. Or spades."
        ],
        claimSelf : [
            "Claim to fame!",
            "That card is mine. It was in the cards."
        ],
        claimOther : [
            "Well, that's a turn-up for the books, {name}.",
            "You've claimed my heart, {name}. And my card."
        ],
        wonClaim : [
            "First come, first served, {name}. And I've been served!",
            "I've staked my claim, {name}. Stake. Steak. Never mind."
        ],
        tookDiscard : [
            "One person's trash is my treasure.",
            "Discard? Dis card is mine."
        ],
        addedToMine : [
            "Thanks, {name}. Many hands make light work.",
            "Join the club, {name}."
        ],
        redAce : [
            "Seeing red, {name}? I am.",
            "Red aces again, {name}? That's rich."
        ],
        reshuffle : [
            "Shuffle off this mortal coil.",
            "Let's shake things up."
        ],
        outSelf : [
            "I'm out! Out of cards, out of sight.",
            "Game, set and... well, not match. Round."
        ],
        outOther : [
            "Out already, {name}? That's a turn-up."
        ],
        caught : [
            "Ouch. That's a lot of points. Pointy points.",
            "Well, I've been dealt a lesson."
        ],
        deckOut : [
            "Nobody out? Deck-idedly odd."
        ],
        wonGame : [
            "I won! It was in the cards all along.",
            "King of the castle!"
        ],
        lostGame : [
            "Lost. But I had fun. That's what counts. No? Points count? Oh.",
            "Back to the drawing board. Or the drawing deck."
        ]
    },

    cis : {
        dealGood : [
            "Oh, these are rather nice.",
            "I think I'll do quite well with these."
        ],
        dealBad : [
            "Oh dear. I've seen better hands on a clock.",
            "Well, they can only get better, dear."
        ],
        dealBlame : [
            "{dealer}, dear, were you shuffling or knitting?",
            "Thank you, {dealer}. I'll put these somewhere nobody can see them."
        ],
        dealer : [
            "Bless you, {name}. Play the cards you're dealt, dear.",
            "I only deal them, {name}. You have to play them."
        ],
        handGood : [
            "Nearly, dear. Very nearly.",
            "Not long now. Do keep up."
        ],
        handBad : [
            "Still a way to go, I'm afraid.",
            "I'm not close, dear. Not even warm."
        ],
        handCoy : [
            "Patience, dear."
        ],
        doubt : [
            "Of course you are, dear.",
            "Is that right, {name}? Your face says otherwise.",
            "Heard that one before, {name}."
        ],
        downSelf : [
            "There we are. Do try to keep up.",
            "Down, dear. Lovely."
        ],
        downOther : [
            "Well done, {name}. About time.",
            "Oh, very good, {name}. Did it take long?"
        ],
        downBig : [
            "My word, {name}. Were you saving those for Christmas?",
            "Goodness. Somebody's been hoarding."
        ],
        comeback : [
            "Thank you, {name}. I'll remember you said that.",
            "Oh, {name}. You are sweet. Wrong, but sweet."
        ],
        claimSelf : [
            "I'll take that, if nobody minds. And if they do, I'll still take it.",
            "Mine, I think, dear."
        ],
        claimOther : [
            "Go on then, {name}. You clearly need it more than me.",
            "Take it, dear. Every little helps."
        ],
        wonClaim : [
            "First come, first served, dear.",
            "Sorry, {name}, dear. I was ahead of you."
        ],
        tookDiscard : [
            "Thank you. Just what I needed.",
            "Ooh, the {card}. Thank you, dear."
        ],
        addedToMine : [
            "Oh, do help yourself, {name}. Everyone else does.",
            "Lovely. Do mind the edges, {name}."
        ],
        redAce : [
            "Another red ace, {name}? Aren't you lucky. Funny, that.",
            "That's a lot of red aces, {name}, dear."
        ],
        reshuffle : [
            "Round we go again."
        ],
        outSelf : [
            "Out, dear. Do add up carefully.",
            "That's me. Pencils at the ready."
        ],
        outOther : [
            "Well played, {name}. I suppose someone had to.",
            "Already, {name}? Goodness."
        ],
        caught : [
            "Oh, that's a lot of points. Never mind.",
            "Well. That could have gone better."
        ],
        deckOut : [
            "Nobody? Oh well. More tea?"
        ],
        wonGame : [
            "Well, that was lovely. Especially the winning.",
            "Thank you, dears. Same time next week?"
        ],
        lostGame : [
            "Well played, all. I'll get you next time.",
            "Never mind. It's only a game. That I lost."
        ],
        groan : [
            "Chris, dear. No.",
            "Very droll, Chris."
        ]
    },

    vena : {
        dealBlame : [
            "I trust you shuffled, {dealer}.",
            "An interesting deal, {dealer}. Interesting."
        ],
        dealer : [
            "One deals, {name}. One does not apologise.",
            "Complaints in writing, please, {name}."
        ],
        handCoy : [
            "All going to plan.",
            "I couldn't possibly comment.",
            "Everything is in hand. Quite literally.",
            "One doesn't discuss one's cards.",
            "Adequate. Entirely adequate.",
            "Everything is proceeding according to plan."
        ],
        doubt : [
            "How very interesting, {name}.",
            "Do go on, {name}."
        ],
        downSelf : [
            "As planned.",
            "Precisely as foreseen."
        ],
        downOther : [
            "Acceptable, {name}.",
            "How quaint."
        ],
        downBig : [
            "Rather showy, {name}.",
            "Goodness. How very... thorough, {name}."
        ],
        comeback : [
            "Noted, {name}.",
            "I shall rise above that, {name}."
        ],
        claimSelf : [
            "I believe that is mine.",
            "If you'll excuse me."
        ],
        claimOther : [
            "Do enjoy it, {name}.",
            "How opportunistic, {name}."
        ],
        wonClaim : [
            "Precedence, {name}. Precedence.",
            "One was ahead of you, {name}."
        ],
        tookDiscard : [
            "That will do.",
            "The {card}. Quite."
        ],
        addedToMine : [
            "How presumptuous, {name}.",
            "You may, {name}. This once."
        ],
        redAce : [
            "One notices these things, {name}.",
            "Another red ace. How fortunate for you, {name}."
        ],
        reshuffle : [
            "A fresh start. For some."
        ],
        outSelf : [
            "And that concludes matters.",
            "Out. As intended."
        ],
        outOther : [
            "Hm. Well played, {name}. For now.",
            "Premature, {name}. But valid."
        ],
        caught : [
            "A temporary setback.",
            "All part of the plan."
        ],
        deckOut : [
            "How unsatisfying."
        ],
        wonGame : [
            "Naturally.",
            "Was there ever any doubt?"
        ],
        lostGame : [
            "A strategic defeat.",
            "I was testing you all."
        ],
        groan : [
            "Chris. Must you?",
            "Quite enough, Chris."
        ]
    }
};
