// Each opponent has a colour for their avatar and their activity-log entries.
const AI_COLORS = ["#2f6f99", "#a0662a", "#7650ae", "#2f7f6f", "#9a4466"];

const YOU_COLOR = "#f4efe3";

const aiColor = (index) => AI_COLORS[index % AI_COLORS.length];

const actorName = (actor, AIPlayers) => (actor === "player") ? "You" : AIPlayers[actor].name;

const actorColor = (actor) => (actor === "player") ? YOU_COLOR : aiColor(actor);

export {YOU_COLOR, aiColor, actorName, actorColor};
