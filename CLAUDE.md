# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Crafty Clara is a single-player browser card game, a contract-rummy variant played against AI opponents. It is built with Vite, React 19 and Redux 5 (via react-redux `connect`). There is no backend: all game logic runs in the browser.

## Commands

Requires Node 20.19+ or 22.12+.

```
npm install
npm run dev                                    # dev server on http://localhost:5173 (npm start also works)
npm run build                                  # production build to dist/
npm run preview                                # serve the production build
npm run lint                                   # oxlint
npm test                                       # Vitest, watch mode
npm test -- --run                              # single run
npx vitest run src/game-functions/hand-functions.test.js   # one file
npx vitest run -t "checkSetrun"                # tests matching a name
```

- Vitest runs with `globals: true` and jsdom (set in `vite.config.js`), so tests use Jest-style `describe`/`it`/`expect` without importing them. jest-dom matchers are loaded in `src/setupTests.js`.
- `.oxlintrc.json` turns on `no-undef`. Undefined identifiers were the main source of runtime crashes in this codebase, so treat lint errors as real bugs. `src/classes/` is excluded from lint (see below).
- Files containing JSX must use the `.jsx` extension. Imports include explicit extensions (`./card/card.jsx`, `./hand-functions.js`).
- Static assets live in `public/`. Card images are `public/img/cards/<displayString>.png`, loaded through `ENV_VAR.IMG_DIR` (`src/store/constants.js`). The other folders under `public/img` hold unused source art.

## Game rules as implemented

- Two 52-card decks, 12 cards per player. `params.numberOfPlayers` (`src/game-functions/params.js`) counts the human, so the default of 4 means 3 AI opponents.
- There are 7 rounds. `ROUND_REQUIREMENTS` (`src/store/constants.js`) gives each round's requirement as `{S, R}`, the number of sets and runs a player must lay down to "go down". After the last round, the round-end screen shows the winner (lowest total) and a New Game button.
- A **set** is 3+ cards of one value, with at least 2 natural cards. A **run** is 4+ consecutive cards of one suit, with at least 3 natural cards. An ace can be low (A-2-3) or high (Q-K-A).
- **Red aces (1H, 1D) are wild**, but there can't be more wilds than naturals. If someone adds the natural card that a red ace stands in for, the natural card replaces it and the ace goes back to that player's hand.
- After going down, a player can add cards to any player's laid-down melds ("hand building").
- **Out-of-turn (OOT) claims:**
  - Once the AI in play has drawn from the deck, other players can claim the top discard.
  - AI players who are not down claim automatically. The human claims by clicking the discard pile during the AI's wait.
  - When several players claim, the first in seat order after the AI in play wins (`AIFunctions.resolveOOT`).
- When the deck runs out, the discard pile (except the top card) is shuffled into a new deck (`App.refillDeckIfEmpty`).
- A round ends as soon as any hand is empty. Cards left in hand score points: an ace is 25, 10 through King are 10, and other cards are their face value.

## Architecture

**One connected component.** `src/App.jsx` is the only component connected to Redux, and `mapStateToProps` passes the whole store in as `props.state`. App holds every event handler and defines every dispatcher inline in `mapDispatchToProps`; there are no separate action-creator files. Handlers reach the UI through `containers/table/table.jsx`. Everything under `src/containers/` and `src/ui/` is a presentational function component. `ui/` holds the overlays: home screen, go-down modal, round-end/game-over summary and modal backdrop.

**State machine driven from `componentDidUpdate`.** `game.gameState` (values in `GAME_STATES`, `src/store/constants.js`) drives each turn:
- The human's turn is `PW_DRAW_CARD → PW_PLAY`, and it advances only through click handlers.
- Each AI's turn runs automatically: `AI_DRAW → AI_WAIT_ONE → AI_DRAW_OOT → AI_WAIT_TWO → AI_OOT_RESOLVE → AI_PLAY`.
- In `AI_PLAY`, an AI that is down keeps adding cards to melds, one action per update, until it can't. Then `FROM_AI_TO_DISCARD` passes the turn to the next AI, or back to `PW_DRAW_CARD`.
- After each state change, `App.componentDidUpdate` checks whether the round has ended, runs the AI decision for the current state and dispatches the next action. `setTimeout` delays let the human see each move and make an OOT claim during the wait states.

These pieces of state keep that loop working. Preserve them when you add a reducer case:
- `game.gameUpdate`: a case sets it to `true` only when `componentDidUpdate` should advance the AI loop. Every case sets it explicitly. If a case leaves it alone, it keeps the previous value, and a UI-only action can re-trigger AI logic.
- `AI.messageUpdate`: an array of the AI indices whose speech bubble was just set. `componentDidUpdate` dispatches `REMOVE_AI_MESSAGE` for them 2 seconds later. Set it to `null` when no new message was set.
- The human's OOT claim lives on the App instance (`this.playerOOTRequest`), not in Redux. It is merged with the AI claims in `AI_OOT_RESOLVE`.

**Reducer.** `src/store/reducer.js` is a single chain of `if (action.type === …)` blocks that use `immutability-helper`'s `update` together with lodash `cloneDeep`. Inside those blocks, nested state is built as plain objects; `{$set: …}` belongs only inside an `update()` spec. Action type strings are in `src/store/actions.js`, and the state shape is in `src/store/initial-state.js`. `src/index.jsx` creates the store with `legacy_createStore` and, in dev only, adds middleware that logs every action and the resulting state to the console.

**Game logic** lives in `src/game-functions/` as plain functions with no React or Redux dependency. Each file has a `*.test.js` beside it.
- `deck-functions.js` builds, shuffles and deals the deck.
- `hand-functions.js`:
  - `checkSetrun(cards, type)` and `addToSetrun(setrun, card)` are the single source of truth for meld validity. The player's go-down and hand-building handlers and the AI all go through them.
  - `scoreHand` is the AI's heuristic. It picks the best partial and complete runs and sets for a requirement (20 points per card, plus 5 per nearby card that could extend a run). Its `bestHand` is only an estimate, so `AIFunctions.canGoDown` re-checks every meld with `checkSetrun` before laying it down.
- `AI-functions.js` makes every AI decision on top of these helpers: draw, discard, OOT claims, go down and hand building.

**Card model.** A card is the object `createCard` returns:

```
{value: 1–13, suit: "C"|"D"|"H"|"S", displayString: "10H", ace?: {value, suit, colour}}
```

- `displayString` is also the image filename. Aces are `1`, and J/Q/K are `11`/`12`/`13`.
- Inside a meld, a red ace is a copy whose `value` and `suit` are set to the card it stands in for. `card.ace` and `displayString` still identify it as the real ace.
- A high ace in a run is a copy with `value: 14`.
- Melds ("setruns") are `{type: "SET"|"RUN", cards, addons?}`, with runs ordered by value. `addons` is computed by `insertBuildOptions` but isn't used by game logic yet.

**Vocabulary** used throughout the code:
- *setrun*: a meld.
- *go down*: lay down setruns that meet the round requirement.
- *table*: the setruns a player has laid down.
- *requirement*: the round's `{S, R}` pair.
- *OOT*: out of turn.
- *PW*: the human player's turn.

## Leftovers

- `src/classes/` (`card.js`, `hand.js`) and the root `testing.js` are old standalone experiments. Nothing imports them, and they would throw if imported.
- `src/project notes.txt` is the author's TODO list.
- `sortPlayerHand` logs a deprecation message every time it is called.
