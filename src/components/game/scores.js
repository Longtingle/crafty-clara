import {YOU_COLOR, aiColor} from './players.js';

// Rows for the Scoreboard. Whoever scored 0 in `round` went out that round.
const scoreRows = (player, AIPlayers, round) => [
    {
        key : "you",
        name : "You",
        color : YOU_COLOR,
        label : "You",
        isYou : true,
        points : player.points.points,
        total : player.points.total,
        wentOut : round !== undefined && player.points.points[round] === 0
    },
    ...AIPlayers.map((AIPlayer, index) => ({
        key : "ai-" + index,
        name : AIPlayer.name,
        color : aiColor(index),
        label : index + 1,
        isYou : false,
        points : AIPlayer.points.points,
        total : AIPlayer.points.total,
        wentOut : round !== undefined && AIPlayer.points.points[round] === 0
    }))
];

export {scoreRows};
