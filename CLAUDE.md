# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Crafty Clara is a single-player browser card game, a contract-rummy variant played against AI opponents. It is built with Vite, React 19 and Redux 5 (via react-redux `connect`), styled with Tailwind CSS v4 and shadcn/ui, and animated with Motion. There is no backend: all game logic runs in the browser.

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
- Files containing JSX must use the `.jsx` extension. Imports include explicit extensions (`./hand.jsx`, `./hand-functions.js`). `@/` is an alias for `src/` (`vite.config.js`, `jsconfig.json`); the UI components use it.
- Card faces are half-size WebP images, `public/img/cards/<displayString>.webp`, loaded through `ENV_VAR.IMG_DIR` (`src/store/constants.js`) by `src/components/game/cards.js`. Their full-size PNG sources are in `art/card-faces/`. The card back is drawn in CSS (`card-back` in `src/index.css`). The rest of `art/` is unused source card art; it is outside `public/` so it isn't copied into builds.

## Game rules as implemented

- Two 52-card decks, 12 cards per player. `params.numberOfPlayers` (`src/game-functions/params.js`) counts the human, so the default of 4 means 3 AI opponents.
- There are 7 rounds. `ROUND_REQUIREMENTS` (`src/store/constants.js`) gives each round's requirement as `{S, R}`, the number of sets and runs a player must lay down to "go down". After the last round, the round-end screen shows the winner (lowest total) and a New Game button.
- A **set** is 3+ cards of one value, with at least 2 natural cards. A **run** is 4+ consecutive cards of one suit, with at least 3 natural cards. An ace can be low (A-2-3) or high (Q-K-A).
- **Red aces (1H, 1D) are wild**, but there can't be more wilds than naturals. If someone adds the natural card that a red ace stands in for, the natural card replaces it and the ace goes back to that player's hand.
- After going down, a player can add cards to any player's laid-down melds ("hand building").
- **Out-of-turn (OOT) claims:**
  - Once the AI in play has drawn from the deck, other players can claim the top discard.
  - AI players who are not down claim automatically. The human gets a Claim or Pass choice beside the discard pile for up to 6 seconds; answering either way ends the wait. When the AI in play took the discard itself, there is nothing to claim and no wait.
  - When several players claim, the first in seat order after the AI in play wins (`AIFunctions.resolveOOT`).
- When the deck runs out, the discard pile (except the top card) is shuffled into a new deck (`App.refillDeckIfEmpty`).
- A round ends as soon as any hand is empty. Cards left in hand score points: an ace is 25, 10 through King are 10, and other cards are their face value.

## Architecture

**One connected component.** `src/App.jsx` is the only component connected to Redux, and `mapStateToProps` passes the whole store in as `props.state`. App holds every event handler and defines every dispatcher inline in `mapDispatchToProps`; there are no separate action-creator files. App renders the home screen, or the table plus the go-down and round-end dialogs, and passes its handlers to the table as one `tableActions` object.

**UI components.**
- `src/components/game/` holds the presentational components. `game-table.jsx` lays out the table and works out what the human can do right now: valid meld targets for the selected card (via `addToSetrun`), the gold "fits a meld" dots, the turn prompt, and whether the claim window is open. `go-down-dialog.jsx` keeps its slot picks in local state and only hands App the finished setruns.
- `src/components/ui/` holds shadcn/ui components (Radix based, added with `npx shadcn@latest add <name>`). They are copied into the repo to be edited: `button.jsx` sizes were raised so every button is at least 44px.
- **Animation** uses Motion (`motion/react`):
  - Every element that shows a card on the table is a `MovingCard` (`playing-card.jsx`) whose `layoutId` is the card's `id`. When a card moves between the deck, the discard pile, a hand and a setrun, its old element unmounts and a new one mounts, and Motion flies the card between them.
  - Render each card id in one place only, because Motion hides all but the newest element with a given `layoutId`. So the opponents' melds and hands are rendered for the current layout only (`useMediaQuery` in `game-table.jsx`), and the go-down dialog uses plain `PlayingCard`s.
  - Opponents' hands are hidden. `HiddenHand` (`opponent-panel.jsx`) renders each of their cards as a tiny card back over their panel's card fan, or over their top-bar chip on short screens. Cards they draw fly in there and then fade out; cards they play fly out from there.
  - The deck's top card and the top two discards sit in `AnimatePresence`, so a card that leaves cross-fades into what it becomes (a face in your hand, a back in an opponent's).
  - In the hand, dnd-kit (`@dnd-kit/sortable`) does drag-to-reorder for mouse and touch, and Motion animates the lift, the sliding and the deal. `Hand` is keyed by round so each deal remounts it.
  - App wraps everything in `MotionConfig reducedMotion="user"`.
- Styling is Tailwind utility classes. The theme lives in `src/index.css`: colour tokens (felt green, gold for "you can act here", violet for wild-ace badges), the fonts, and card sizes as CSS variables (`--hand-w`, `--pile-w`, `--meld-w`) that scale with the viewport. Rows of setruns never wrap: `MeldRow` (`meld.jsx`) lowers `--meld-w` until a player's setruns fit on one line, the way the hand's overlap grows with its size. Two custom variants trim the layout for small windows: `compact:` (height 780px or less) and `short:` (height 560px or less, i.e. a phone in landscape). A phone held upright gets a "turn your phone sideways" screen.

**State machine driven from `componentDidUpdate`.** `game.gameState` (values in `GAME_STATES`, `src/store/constants.js`) drives each turn:
- The human's turn is `PW_DRAW_CARD → PW_PLAY`, and it advances only through click handlers.
- Each AI's turn runs automatically: `AI_DRAW → AI_WAIT_ONE → AI_DRAW_OOT → AI_WAIT_TWO → AI_OOT_RESOLVE → AI_PLAY`.
- In `AI_PLAY`, an AI that is down keeps adding cards to melds, one action per update, until it can't. Each step (`App.AIPlayStep`) runs `AI_PACE.move` after the last, so each card lands before the next one flies. Then `FROM_AI_TO_DISCARD` passes the turn to the next AI, or back to `PW_DRAW_CARD`.
- After each state change, `App.componentDidUpdate` checks whether the round has ended, runs the AI decision for the current state and dispatches the next action. It returns early when `props.state` hasn't changed. `setTimeout` delays from `AI_PACE` (`src/store/constants.js`) let the human follow each AI move and claim discards: a pause before each AI draws, the two halves of the claim window, and a pause between AI moves.

These pieces of state keep that loop working. Preserve them when you add a reducer case:
- `game.gameUpdate`: a case sets it to `true` only when `componentDidUpdate` should advance the AI loop. Every case sets it explicitly. If a case leaves it alone, it keeps the previous value, and a UI-only action can re-trigger AI logic.
- `AI.messageUpdate`: an array of the AI indices whose speech bubble was just set. `componentDidUpdate` dispatches `REMOVE_AI_MESSAGE` for them 2 seconds later. Set it to `null` when no new message was set.
- `claimChoice`: the human's answer in the claim window, `"claim"` or `"pass"` (`null` until they answer). It is set by the UI-only actions `PLAYER_DRAW_OOT` and `PLAYER_PASS_OOT`, so `gameUpdate` is `false`. An answer ends the wait at once (`App.answerClaim` cancels the timer that `App.waitForClaim` set). A claim is merged with the AI claims in `AI_OOT_RESOLVE`. It is cleared when claims are resolved or the turn moves on.

**Reducer.** `src/store/reducer.js` is a single chain of `if (action.type === …)` blocks that use `immutability-helper`'s `update` together with lodash `cloneDeep`. Inside those blocks, nested state is built as plain objects; `{$set: …}` belongs only inside an `update()` spec. Action type strings are in `src/store/actions.js`, and the state shape is in `src/store/initial-state.js`. `src/index.jsx` creates the store with `legacy_createStore` and, in dev only, adds middleware that logs every action and the resulting state to the console.
- The reducer is exported wrapped in `withLog` (`src/store/log.js`). After each action, `describeAction` turns it into an activity-log entry `{id, actor, text}` (actor is `"player"` or an AI index) and prepends it to `state.log`. The log is cleared at the start of each round. To log a new action, add a case to `describeAction`; the reducer cases don't need changing.
- `player.newCard` (`{id, label}`) marks the card the human just drew, claimed or got back from a meld, so the hand can tag it.

**Game logic** lives in `src/game-functions/` as plain functions with no React or Redux dependency. Each file has a `*.test.js` beside it.
- `deck-functions.js` builds, shuffles and deals the deck.
- `hand-functions.js`:
  - `checkSetrun(cards, type)` and `addToSetrun(setrun, card)` are the single source of truth for meld validity. The player's go-down and hand-building handlers and the AI all go through them.
  - `explainSetrun(cards, type)` says in plain words why cards aren't a valid setrun yet, and returns `null` exactly when `checkSetrun` accepts them. The go-down dialog shows it.
  - `scoreHand` is the AI's heuristic. It picks the best partial and complete runs and sets for a requirement (20 points per card, plus 5 per nearby card that could extend a run). Its `bestHand` is only an estimate, so `AIFunctions.canGoDown` re-checks every meld with `checkSetrun` before laying it down.
- `AI-functions.js` makes every AI decision on top of these helpers: draw, discard, OOT claims, go down and hand building. The UI also uses `canGoDown` to tell the human when their hand is ready.
- `card-names.js` turns cards and setruns into text: `shortName` ("7♦"), `longName` ("Seven of diamonds", for screen readers), `setrunCaption` ("Run 3–6 ♦") and `requirementText` ("1 set + 1 run").

**Card model.** A card is the object `createCard` returns:

```
{value: 1–13, suit: "C"|"D"|"H"|"S", displayString: "10H", id: "10H-3-1", ace?: {value, suit, colour}}
```

- `id` is set by `generateDeck` (card, deck number, copy). It is unique across rounds and games and stays with the physical card wherever it goes, including wild-ace copies and an ace returned from a meld. The UI uses it for React keys, Motion `layoutId`s and dnd-kit. Cards made directly with `createCard` (in tests, for example) have no id.

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
