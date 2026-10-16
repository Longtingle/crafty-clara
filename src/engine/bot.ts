// How a bot plays. A bot sees only its own view, the same as a person would,
// and answers with a command (botMove). The decisions rest on scoreHand, a
// heuristic that finds the best partial and complete setruns for the round's
// requirement.
//
// There are two levels. A normal bot plays its own hand. A hard bot also
// reads the table (clues.ts): it remembers, imperfectly, what the others
// pick up and throw away, and which cards are gone. It avoids discarding what
// would help them, and collects the setruns it can still finish.

import {RUN, SET, SUITS, asWild, getPoints, isRedAce, type Card, type Requirement, type Setrun, type SetrunType} from './cards.ts';
import {addToSetrun, checkSetrun, runEnds, runLayouts, sortHand, subsets, type RunEnd} from './setruns.ts';
import {readClues, type Clues, type Memory} from './clues.ts';
import type {Command, Target} from './game.ts';
import {random} from './random.ts';
import type {GameView} from './view.ts';
import type {CharacterId} from './cast.ts';

export type BotLevel = "normal" | "hard";

/** Who a bot is: its level, a seed for what it forgets, and how much risk it takes. */
export interface BotProfile {
    level: BotLevel;
    seed: number;
    /**
     * From 0 (cautious, the default) to 1 (a gambler): how readily a hard
     * bot holds off going down, to keep its setruns hidden. Each bot's is
     * secret and lasts the whole game.
     */
    risk?: number;
    /** who the bot is, if one of the cast (cast.ts): their risk is their own */
    character?: CharacterId;
}

export const NORMAL_BOT: BotProfile = {level : "normal", seed : 0};

/** The chance, at the most risk, that a hard bot holds off going down on a turn when it could. */
const HOLD_CHANCE = 0.8;
/**
 * The most cards a round may need for a hard bot to hold off going down. In
 * rounds 1 to 4 (6 to 9 cards), the first player down never went out in the
 * same turn in tournaments; in rounds 6 and 7, 11% and 20% did.
 */
const MAX_HOLD_CARDS = 9;

/** How well a hard bot remembers what it saw (see clues.ts). */
const HARD_MEMORY: Omit<Memory, "seed"> = {fresh : 0.95, fade : 0.92};

/** What a hard bot reads from the table. A normal bot plays without it. */
export type Insight = Pick<Clues, "danger" | "outs">;

/**
 * A hard bot marks an unfinished setrun down by OUTS_WEIGHT for each card it
 * is short of OUTS_CAP cards still to be had that would grow it. So it keeps
 * collecting what it can finish, rather than what's gone or what others want.
 * In tournaments this saved about 22 points a game; anything from 5 to 10
 * did about as well.
 */
const OUTS_WEIGHT = 7;
const OUTS_CAP = 4;

/**
 * How many points a hard bot would keep in hand rather than discard a card
 * someone surely wants. Small on purpose: in tournaments, keeping high cards
 * back to deny others cost more points than it saved, but choosing the safer
 * of two discards worth about the same helped (by about 4 points a game).
 */
const DANGER_WEIGHT = 2;

type Indexed = Card & {index: number};

/** A set or run the bot is collecting, complete or not. */
interface Candidate<C extends Card> {
    type: SetrunType;
    cards: C[];
    complete: boolean;
    score: number;
    /** cards near a run that could join it later */
    potentialCards: C[];
}

const makeRun = <C extends Card>(cards: C[]): Candidate<C> => ({
    type : RUN,
    cards,
    complete : cards.length >= 4,
    score : cards.length * 20,
    potentialCards : []
});

// Finds every run of two or more consecutive cards in each suit, best first.
// Red aces should be removed from the hand before calling this.
const getRuns = <C extends Card>(hand: C[]): {numFullRuns: number; runs: Candidate<C>[]} => {
    let runs: Candidate<C>[] = [];

    for (let suit of SUITS) {
        let suited = sortHand(hand.filter(card => card.suit === suit), RUN);

        // an ace can sit above a king instead of below a two
        let hasKing = suited.some(card => card.value === 13);
        let hasTwo = suited.some(card => card.value === 2);
        if (suited.length > 0 && suited[0].value === 1 && hasKing && !hasTwo) {
            suited.push({...suited.shift()!, value : 14});
        }

        let suitRuns: Candidate<C>[] = [];
        let run: C[] = [];
        const closeRun = () => {
            if (run.length >= 2) suitRuns.push(makeRun(run));
        };
        for (let card of suited) {
            let last = run[run.length - 1];
            if (last === undefined || card.value === last.value + 1) {
                run.push(card);
            } else if (card.value !== last.value) {
                closeRun();
                run = [card];
            }
            // a duplicate of the previous card neither extends nor breaks the run
        }
        closeRun();

        for (let run of suitRuns) {
            let first = run.cards[0].value;
            let last = run.cards[run.cards.length - 1].value;
            let runValues = run.cards.map(card => card.value);
            run.potentialCards = suited.filter(card =>
                !runValues.includes(card.value) &&
                (Math.abs(card.value - first) < 4 || Math.abs(card.value - last) < 4));
            run.score += run.potentialCards.length * 5;
        }
        runs.push(...suitRuns);
    }

    runs.sort((a, b) => (b.score - a.score) || (b.cards[0].value - a.cards[0].value));
    return {
        numFullRuns : runs.filter(run => run.complete).length,
        runs
    };
};

// Finds every pair or better of the same value, best first.
// Red aces should be removed from the hand before calling this.
const getSets = <C extends Card>(hand: C[]): {numFullSets: number; sets: Candidate<C>[]} => {
    let byValue = new Map<number, C[]>();
    for (let card of hand) byValue.set(card.value, [...(byValue.get(card.value) ?? []), card]);

    let sets: Candidate<C>[] = [...byValue.values()]
        .filter(cards => cards.length >= 2)
        .map(cards => ({
            type : SET,
            cards,
            complete : cards.length >= 3,
            score : cards.length * 20,
            potentialCards : []
        }));
    sets.sort((a, b) => (b.score - a.score) || (b.cards[0].value - a.cards[0].value));

    return {
        numFullSets : sets.filter(set => set.complete).length,
        sets
    };
};

type HandScore = ReturnType<typeof scoreWith>;

// The candidates, best first, once a hard bot has marked down the unfinished
// ones it's unlikely to finish.
const rated = <C extends Card>(candidates: Candidate<C>[], insight?: Insight): Candidate<C>[] => {
    if (!insight) return candidates;
    return candidates
        .map(candidate => candidate.complete ? candidate : {
            ...candidate,
            score : candidate.score - OUTS_WEIGHT * (OUTS_CAP - Math.min(OUTS_CAP, insight.outs(candidate.type, candidate.cards)))
        })
        .sort((a, b) => (b.score - a.score) || (b.cards[0].value - a.cards[0].value));
};

// Scores a hand against the requirement: 20 points per card in the best runs
// and sets, plus 5 for each card near a run that could extend it. Each card
// of bestHand and usefulCards carries its index in the hand.
//
// Each red ace is tried both as a wild, which completes a setrun that is one
// card short, and as an ace, which can make a set of aces or the ace of a run
// in its own suit. The best reading counts; on a tie, the one with more wilds.
const scoreHand = (pHand: Card[], requirement: Requirement, insight?: Insight): HandScore => {
    let redAces = pHand.flatMap((card, index) => isRedAce(card) ? [index] : []);
    let best: HandScore | null = null;
    for (let asAces of subsets(redAces).reverse()) {
        let score = scoreWith(pHand, requirement, new Set(asAces), insight);
        let better = !best ||
            (score.readyToGoDown !== best.readyToGoDown ? score.readyToGoDown : score.score > best.score);
        if (better) best = score;
    }
    return best!;
};

// asAces: the hand indices of the red aces that play as themselves.
const scoreWith = (pHand: Card[], requirement: Requirement, asAces: Set<number>, insight?: Insight) => {
    if (requirement.S === 0 && requirement.R === 0) {
        throw new Error("requirement should include at least one set or run");
    }
    let all: Indexed[] = pHand.map((card, index) => ({...card, index}));
    let wild = (card: Indexed): boolean => isRedAce(card) && !asAces.has(card.index);
    let redAces = all.filter(wild);
    let hand = all.filter(card => !wild(card));
    let output = {
        score : 0,
        readyToGoDown : false,
        bestHand : [] as Candidate<Indexed>[],
        usefulCards : [] as Indexed[]
    };

    let usedIndices = new Set<number>();

    if (requirement.R > 0) {
        let runs = rated(getRuns(hand).runs, insight).slice(0, requirement.R);
        runs.forEach(run => run.cards.forEach(card => usedIndices.add(card.index)));

        for (let run of runs) {
            //can we use a red ace to complete this run?
            if (!run.complete && redAces.length !== 0) {
                let first = run.cards[0].value;
                let last = run.cards[run.cards.length - 1].value;
                if (run.cards.length === 3) {
                    let aceValue = (first === 1) ? last + 1 : first - 1;
                    run.cards.push(asWild(redAces.shift()!, aceValue, run.cards[0].suit));
                    run.complete = true;
                    run.score += 20;
                } else {
                    // a card two away from either end can join the run with an ace in the gap
                    let gapCard = run.potentialCards.find(card =>
                        (card.value === last + 2 || card.value === first - 2) && !usedIndices.has(card.index));
                    if (gapCard) {
                        let aceValue = (gapCard.value === last + 2) ? gapCard.value - 1 : gapCard.value + 1;
                        run.cards.push(asWild(redAces.shift()!, aceValue, run.cards[0].suit));
                        run.cards.push(gapCard);
                        run.potentialCards = run.potentialCards.filter(card => card !== gapCard);
                        usedIndices.add(gapCard.index);
                        run.complete = true;
                        run.score += 40 - 5;
                    }
                }
            }
            output.bestHand.push(run);
            output.score += run.score;
            output.usefulCards.push(...run.cards, ...run.potentialCards);
        }
    }

    if (requirement.S > 0) {
        let setHand = hand.filter(card => !usedIndices.has(card.index));
        let sets = rated(getSets(setHand).sets, insight).slice(0, requirement.S);

        for (let set of sets) {
            //can we use a red ace to complete this set?
            if (!set.complete && redAces.length !== 0 && set.cards.length === 2) {
                let ace = redAces.shift()!;
                set.cards.push(asWild(ace, set.cards[0].value, ace.ace!.suit));
                set.complete = true;
                set.score += 20;
            }
            output.bestHand.push(set);
            output.score += set.score;
            output.usefulCards.push(...set.cards);
        }
    }

    output.usefulCards = [...new Set(output.usefulCards)];

    //are we ready to go down? we need the right number of setruns, all complete.
    output.readyToGoDown = output.bestHand.length === requirement.R + requirement.S &&
        output.bestHand.every(setrun => setrun.complete);

    return output;
};

/** Whether a card is worth taking, from the discard pile or by claiming it. */
const wantsCard = (hand: Card[], requirement: Requirement, card: Card, insight?: Insight): boolean =>
    scoreHand([...hand, card], requirement, insight).score > scoreHand(hand, requirement, insight).score + 5;

/**
 * The index of the card to discard: the highest card that isn't useful, then
 * the highest not in the best hand. Red aces are kept if possible.
 *
 * A hard bot judges what's useful by what it can still finish, and weighs
 * how dangerous each card is to discard (the chance it helps someone else)
 * against the card's points instead of discarding the highest.
 */
const chooseDiscard = (hand: Card[], requirement: Requirement, isDown: boolean, insight?: Insight): number => {
    let indexed: Indexed[] = hand.map((card, index) => ({...card, index}));
    let candidates = indexed;

    if (!isDown) {
        let handResult = scoreHand(hand, requirement, insight);
        let useful = new Set(handResult.usefulCards.map(card => card.index));
        let best = new Set(handResult.bestHand.flatMap(setrun => setrun.cards.map(card => card.index)));
        candidates = indexed.filter(card => !useful.has(card.index));
        if (candidates.length === 0) candidates = indexed.filter(card => !best.has(card.index));
        if (candidates.length === 0) candidates = indexed;
    }

    let notWild = candidates.filter(card => !isRedAce(card));
    if (notWild.length > 0) candidates = notWild;

    if (insight) {
        let worth = (card: Card): number => getPoints([card]) - DANGER_WEIGHT * insight.danger(card);
        return candidates.reduce((best, card) => (worth(card) > worth(best)) ? card : best).index;
    }
    return candidates.reduce((highest, card) => (card.value > highest.value) ? card : highest).index;
};

/** A setrun the bot could go down with: its natural cards, and how many wild aces it needs. */
interface Option {
    type: SetrunType;
    naturals: Card[];
    wilds: number;
}

// Every way of choosing `size` of the items, in their order.
const combinations = <T>(items: T[], size: number): T[][] => (size === 0)
    ? [[]]
    : items.flatMap((item, i) => combinations(items.slice(i + 1), size - 1).map(rest => [item, ...rest]));

// The runs the bot could make: in each suit, each stretch of 4 or more values
// with at least 3 natural cards and wild aces in the gaps. A stretch starts
// and ends on natural cards, unless it needs a wild at an end to be long enough.
const runOptions = (naturals: Card[], wilds: number): Option[] => SUITS.flatMap(suit => {
    let byValue = new Map<number, Card>();
    for (let card of naturals) {
        if (card.suit === suit && !byValue.has(card.value)) byValue.set(card.value, card);
    }
    let ace = byValue.get(1);
    if (ace) byValue.set(14, ace);

    let options: Option[] = [];
    for (let low = 1; low <= 11; low++) {
        for (let high = low + 3; high <= Math.min(14, low + 12); high++) {
            let cards: Card[] = [];
            for (let value = low; value <= high; value++) {
                let card = byValue.get(value);
                if (card) cards.push(card);
            }
            let missing = high - low + 1 - cards.length;
            let naturalEnds = byValue.has(low) && byValue.has(high);
            if (cards.length >= 3 && missing <= Math.min(wilds, cards.length) && (naturalEnds || high - low === 3)) {
                options.push({type : RUN, naturals : cards, wilds : missing});
            }
        }
    }
    return options;
});

// The sets the bot could make: all its natural cards of a value, with a wild
// ace if it has only two.
const setOptions = (naturals: Card[], wilds: number): Option[] => {
    let byValue = new Map<number, Card[]>();
    for (let card of naturals) byValue.set(card.value, [...(byValue.get(card.value) ?? []), card]);
    return [...byValue.values()]
        .filter(group => group.length >= 3 || (group.length === 2 && wilds > 0))
        .map(group => ({type : SET, naturals : group, wilds : (group.length >= 3) ? 0 : 1}));
};

// What a card left in hand costs, besides its points, when choosing how to go
// down: each one is another card to get rid of before going out.
const CARD_COST = 10;

// The cards left in hand once the bot has added everything it can to the
// setruns on the tables, the way botMove does once it is down.
const afterAdding = (hand: Card[], tables: Setrun[][]): Card[] => {
    let rest = hand;
    let changed = tables.map(table => [...table]);
    // each addition uses up a natural card, so this always ends; the limit is a safeguard
    for (let step = 0; step < 50; step++) {
        let addition = findAddition(rest, changed);
        if (!addition) break;
        let {card, target} = addition;
        let result = addToSetrun(changed[target.seat][target.index], card);
        if (!result.valid) break;
        changed[target.seat][target.index] = result.setrun;
        rest = rest.filter(other => other.id !== card.id);
        if (result.returnedAce) rest = [...rest, result.returnedAce];
    }
    return rest;
};

/**
 * The setruns to lay down and the cards left over, if the hand meets the
 * requirement. Of all the ways to go down, the bot picks the one that leaves
 * the fewest points in its hand (with CARD_COST for each card) after it adds
 * what it can to the setruns on the tables (by seat), its own new ones included.
 */
const planGoDown = (hand: Card[], requirement: Requirement, tables: Setrun[][] = []): {table: Setrun[]; rest: Card[]} | null => {
    let best: {table: Setrun[]; rest: Card[]; cost: number} | null = null;
    let redAces = hand.filter(isRedAce);
    let wildsIn = (options: Option[]): number => options.reduce((sum, option) => sum + option.wilds, 0);

    // each red ace can play as itself or as a wild
    for (let asAces of subsets(redAces)) {
        let naturals = hand.filter(card => !isRedAce(card) || asAces.includes(card));
        let wilds = redAces.filter(ace => !asAces.includes(ace));

        for (let runs of combinations(runOptions(naturals, wilds.length), requirement.R)) {
            let inRuns = new Set(runs.flatMap(run => run.naturals));
            if (inRuns.size !== runs.reduce((sum, run) => sum + run.naturals.length, 0)) continue;
            if (wildsIn(runs) > wilds.length) continue;
            let left = naturals.filter(card => !inRuns.has(card));

            for (let sets of combinations(setOptions(left, wilds.length - wildsIn(runs)), requirement.S)) {
                if (wildsIn(runs) + wildsIn(sets) > wilds.length) continue;
                let unused = [...wilds];
                let table: Setrun[] = [];
                for (let option of [...runs, ...sets]) {
                    let check = checkSetrun([...option.naturals, ...unused.splice(0, option.wilds)], option.type);
                    if (!check.valid) break;
                    table.push(check.setrun);
                }
                if (table.length < runs.length + sets.length) continue;

                let laid = new Set(table.flatMap(setrun => setrun.cards.map(card => card.id)));
                let rest = hand.filter(card => !laid.has(card.id));
                let kept = afterAdding(rest, [...tables, table]);
                let cost = getPoints(kept) + CARD_COST * kept.length;
                // on a tie, lay more down at once
                if (!best || cost < best.cost || (cost === best.cost && rest.length < best.rest.length)) best = {table, rest, cost};
            }
        }
    }
    return best && {table : best.table, rest : best.rest};
};

/** A card from the hand that fits a setrun on the table (tables are by seat), and where it goes. */
const findAddition = (hand: Card[], tables: Setrun[][]): {card: Card; target: Target} | null => {
    for (let seat = 0; seat < tables.length; seat++) {
        for (let index = 0; index < tables[seat].length; index++) {
            let card = hand.find(card => addToSetrun(tables[seat][index], card).valid);
            if (card) return {card, target : {seat, index}};
        }
    }
    return null;
};

// How many ends of a run another card could still go on: none past an ace,
// and none, as far as the bot knows (`known`), where both copies of the card
// are gone.
const openEnds = (run: Setrun, known?: Pick<Clues, "gone">): number => {
    let first = run.cards[0];
    let last = run.cards[run.cards.length - 1];
    let open = (value: number) => !known || known.gone((value === 14) ? 1 : value, first.suit) < 2;
    return Number(first.value > 1 && open(first.value - 1)) + Number(last.value < 14 && open(last.value + 1));
};

// Of the ways a run could go down or take a red ace (a wild at one end or the
// other), the one a hard bot likes best. First, the one that lets it add the
// most from its hand (`rest`) to the tables afterwards: holding the 7♥, it
// plays the A♦ on 9–K♥ as the 8♥. Then the one that leaves the others least
// to add: with no hearts to follow, the A♦ goes on top as the A♥, and nothing
// can go above it.
const likedBest = (options: Setrun[], tablesWith: (option: Setrun) => Setrun[][], rest: Card[], known?: Pick<Clues, "gone">): Setrun => {
    let score = (option: Setrun) => {
        let kept = afterAdding(rest, tablesWith(option));
        return {cost : getPoints(kept) + CARD_COST * kept.length, open : openEnds(option, known)};
    };
    let best = {option : options[0], ...score(options[0])};
    for (let option of options.slice(1)) {
        let next = {option, ...score(option)};
        if (next.cost < best.cost || (next.cost === best.cost && next.open < best.open)) best = next;
    }
    return best.option;
};

// A hard bot lays out each run it goes down with that could go more than one way as it likes best.
const layOutRuns = (plan: {table: Setrun[]; rest: Card[]}, tables: Setrun[][], known?: Pick<Clues, "gone">): Setrun[] => {
    let table = [...plan.table];
    table.forEach((setrun, i) => {
        if (setrun.type !== RUN) return;
        let options = runLayouts(setrun.cards);
        if (options.length > 1) {
            table[i] = likedBest(options, option => [...tables, table.map((other, j) => (j === i) ? option : other)], plan.rest, known);
        }
    });
    return table;
};

// Which end of a run a hard bot adds a card to, where it could go at either.
const chooseEnd = (hand: Card[], {card, target}: {card: Card; target: Target}, tables: Setrun[][], known?: Pick<Clues, "gone">): RunEnd | undefined => {
    let setrun = tables[target.seat][target.index];
    let places = runEnds(setrun, card);
    if (places.length < 2) return undefined;
    let options = places.map(place => ({...setrun, cards : place.cards}));
    let tablesWith = (option: Setrun) => tables.map((table, seat) => (seat !== target.seat)
        ? table
        : table.map((other, index) => (index === target.index) ? option : other));
    let best = likedBest(options, tablesWith, hand.filter(other => other.id !== card.id), known);
    return places[options.indexOf(best)].end;
};

/**
 * Whether a hard bot holds off going down this turn. While nobody else is
 * down it may wait, so the others can't see its setruns or add to them, with
 * a chance that grows with its risk. The chance is drawn from its seed, so it
 * decides the same way however often it's asked during a turn.
 *
 * It only waits in rounds that need few cards (MAX_HOLD_CARDS), where someone
 * going down and out in one turn almost never happens, and never once anyone
 * else is down, or when going down would let it go out. In tournaments,
 * waiting like this neither helped nor hurt; waiting in the later rounds
 * too cost about 5 points a game.
 */
const holdsOff = (view: GameView, plan: {table: Setrun[]; rest: Card[]}, profile: BotProfile): boolean => {
    let risk = profile.risk ?? 0;
    let {S, R} = view.requirement;
    if (risk === 0 || 3 * S + 4 * R > MAX_HOLD_CARDS) return false;
    if (view.seats.some((seat, index) => index !== view.seat && seat.isDown)) return false;
    let tables = view.seats.map(seat => seat.table);
    if (afterAdding(plan.rest, [...tables, plan.table]).length <= 1) return false;
    let turn = view.log.filter(entry => entry.type === "discard").length;
    let seeded = {rng : profile.seed ^ Math.imul(view.round + 1, 0x2545F491) ^ Math.imul(turn + 1, 0x9E3779B9)};
    return random(seeded) < risk * HOLD_CHANCE;
};

// Whether to take the top discard instead of drawing from the deck. Two kinds
// of take would only pass a card round the table for ever:
// - once down, a card is only any use if it can go onto a setrun; taking one
//   to pair with another is no good, as nobody can lay the pair down
// - a card the bot would throw straight back, because its hand is so full of
//   setruns that the new card is the one it can best spare
const worthTaking = (view: GameView, card: Card, insight?: Insight): boolean => {
    let {hand, requirement} = view;
    if (view.seats[view.seat].isDown) return findAddition([card], view.seats.map(seat => seat.table)) !== null;
    if (!wantsCard(hand, requirement, card, insight)) return false;
    let after = [...hand, card];
    return after[chooseDiscard(after, requirement, false, insight)].id !== card.id;
};

/**
 * The bot's next command, or null while it has nothing to do. It's ready to
 * start as soon as a round is dealt, and answers a claim window as soon as one
 * opens; on its own turn it draws, goes down when it can, then adds cards to
 * setruns one at a time, and discards last. It is ready for the next round as
 * soon as a round ends.
 */
const botMove = (view: GameView, profile: BotProfile = NORMAL_BOT): Command | null => {
    let {hand, requirement} = view;
    let me = view.seats[view.seat];
    let tables = view.seats.map(seat => seat.table);

    // a hard bot reads the table when it has something to decide
    let read: Clues | undefined;
    const insight = (): Clues | undefined =>
        (profile.level === "hard") ? (read ??= readClues(view, {seed : profile.seed, ...HARD_MEMORY})) : undefined;

    if (view.look) return view.look.ready[view.seat] ? null : {type : "start"};
    if (view.phase === "roundEnd") return me.ready ? null : {type : "ready"};
    if (view.claim?.canAnswer) {
        // a bot that is down only takes cards on its own turn
        let wants = !me.isDown && wantsCard(hand, requirement, view.claim.card, insight());
        return {type : wants ? "claim" : "pass"};
    }
    if (view.turn !== view.seat) return null;

    if (view.phase === "draw") {
        let top = view.discard[0];
        let takeDiscard = top !== undefined && (!view.deck.canDraw || worthTaking(view, top, insight()));
        return {type : "draw", from : takeDiscard ? "discard" : "deck"};
    }
    // let the others claim or pass before playing on
    if (view.phase !== "play" || view.claim) return null;

    if (!me.isDown) {
        let plan = planGoDown(hand, requirement, tables);
        if (plan && !(profile.level === "hard" && holdsOff(view, plan, profile))) {
            if (profile.level !== "hard") {
                return {type : "goDown", setruns : plan.table.map(setrun => ({type : setrun.type, cards : setrun.cards.map(card => card.id)}))};
            }
            // a hard bot chooses which end of a run a spare wild goes
            return {type : "goDown", setruns : layOutRuns(plan, tables, insight()).map(setrun => ({
                type : setrun.type,
                cards : setrun.cards.map(card => card.id),
                ...((setrun.type === RUN) ? {from : setrun.cards[0].value} : {})
            }))};
        }
    } else {
        let addition = findAddition(hand, tables);
        if (addition) {
            // a hard bot chooses which end of a run a red ace goes
            let end = (profile.level === "hard") ? chooseEnd(hand, addition, tables, insight()) : undefined;
            return {type : "addToSetrun", card : addition.card.id, target : addition.target, ...(end ? {end} : {})};
        }
    }
    return {type : "discard", card : hand[chooseDiscard(hand, requirement, me.isDown, insight())].id};
};

export {
    getRuns,
    getSets,
    scoreHand,
    wantsCard,
    chooseDiscard,
    planGoDown,
    findAddition,
    botMove
};
