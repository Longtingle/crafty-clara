// The characters who sit at the table. Each keeps the same personality from
// game to game, so a player can get to know them: how readily they hold off
// going down, and how they talk (lines.ts), and whether to believe them.

export type CharacterId = "clara" | "alan" | "julie" | "steve" | "gemma" | "chris" | "cis" | "vena";

/**
 * What their talk about their own hand is worth (talk.ts): honest, mostly
 * honest, a bluffer who moans most when nearly down, a boaster whatever
 * their hand, random, or giving nothing away.
 */
export type Honesty = "honest" | "mostly" | "bluffs" | "boasts" | "random" | "closed";

export interface Character {
    id: CharacterId;
    name: string;
    /** how they come across, for choosing who to play: "Dry and teasing" */
    manner: string;
    /**
     * How readily they hold off going down, to keep their setruns hidden
     * (BotProfile.risk), from 0 to 1. It only shows at the hard level.
     */
    risk: number;
    honesty: Honesty;
}

export const CAST: Character[] = [
    {id : "clara", name : "Clara", manner : "Dry and teasing", risk : 0.8, honesty : "bluffs"},
    {id : "alan", name : "Alan", manner : "Grumpy, and hard done by", risk : 0.3, honesty : "honest"},
    {id : "julie", name : "Julie", manner : "Sweet as pie, but ruthless", risk : 0.5, honesty : "mostly"},
    {id : "steve", name : "Steve", manner : "Cocky show-off", risk : 0.1, honesty : "boasts"},
    {id : "gemma", name : "Gemma", manner : "Blunt. Says it straight", risk : 0.2, honesty : "honest"},
    {id : "chris", name : "Chris", manner : "Terrible puns", risk : 0.5, honesty : "random"},
    {id : "cis", name : "Cis", manner : "Kind, but razor sharp", risk : 0.6, honesty : "honest"},
    {id : "vena", name : "Vena", manner : "Pompous, and gives nothing away", risk : 1, honesty : "closed"}
];

export const character = (id: CharacterId): Character => CAST.find(c => c.id === id)!;

export const isCharacterId = (value: unknown): value is CharacterId => CAST.some(c => c.id === value);

/** A line-up of different characters, at random. */
export const dealCast = (count: number, rng: () => number = Math.random): CharacterId[] => {
    let left = CAST.map(c => c.id);
    return Array.from({length : Math.min(count, left.length)}, () => left.splice(Math.floor(rng() * left.length), 1)[0]);
};
