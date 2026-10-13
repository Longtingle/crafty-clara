# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Crafty Clara is a browser card game, a contract-rummy variant played against bot opponents. It is built with Vite and React 19, styled with Tailwind CSS v4 and shadcn/ui, and animated with Motion. There is no backend: all game logic runs in the browser.

The game is partway through a move to a new architecture, so it can later be played online:
- **Done:** `src/engine/`, a TypeScript rules engine with a seat-by-seat view of the game and bots that play from those views.
- **Next:** a host that runs the engine in the page, with bots as seats.
- **Then:** the UI switches over, with function components and a `useGame()` hook.

Until then, the UI still runs the old Redux loop in `App.jsx`. It uses the engine's rule and bot functions but not its game state.

## Commands

Requires Node 20.19+ or 22.12+.

```
npm install
npm run dev                                    # dev server on http://localhost:5173 (npm start also works)
npm run build                                  # production build to dist/
npm run preview                                # serve the production build
npm run lint                                   # oxlint
npm run typecheck                              # tsc (TypeScript 7) over the .ts files
npm test                                       # Vitest, watch mode
npm test -- --run                              # single run
npx vitest run src/engine/game.test.ts         # one file
npx vitest run -t "checkSetrun"                # tests matching a name
```

- Vitest runs with `globals: true` and jsdom (set in `vite.config.js`), so tests use Jest-style `describe`/`it`/`expect` without importing them. jest-dom matchers are loaded in `src/setupTests.js`. Engine tests start with `// @vitest-environment node`, which shows the engine needs no browser.
- `.oxlintrc.json` turns on `no-undef`. Undefined identifiers were the main source of runtime crashes in this codebase, so treat lint errors as real bugs. `src/classes/` is excluded from lint (see below).
- `tsconfig.json`:
  - It is strict, and it checks `.ts` files only (`checkJs` is off).
  - `erasableSyntaxOnly` rules out enums, namespaces and constructor parameter properties, so Node can run the engine just by stripping its types.
  - Type-only imports need `import type` (`verbatimModuleSyntax`).
- Files containing JSX must use the `.jsx` extension. Imports include explicit extensions (`./hand.jsx`, `./game.ts`). `@/` is an alias for `src/` (`vite.config.js`, `tsconfig.json`); the UI components use it.
- Card faces are half-size WebP images, `public/img/cards/<displayString>.webp`, loaded through `ENV_VAR.IMG_DIR` (`src/store/constants.js`) by `src/components/game/cards.js`. Their full-size PNG sources are in `art/card-faces/`. The card back is drawn in CSS (`card-back` in `src/index.css`). The rest of `art/` is unused source card art; it is outside `public/` so it isn't copied into builds.

## Game rules

These are the engine's rules (`src/engine/game.ts`).

**Deck and rounds**
- Two 52-card decks, 12 cards per player, 2 to 6 players.
- There are 7 rounds. `ROUND_REQUIREMENTS` (`src/engine/cards.ts`) gives each round's requirement as `{S, R}`: the number of sets and runs a player must lay down to "go down".
- The first player moves one seat on each round. The lowest total after the last round wins.

**Setruns**
- A **set** is 3+ cards of one value, with at least 2 natural cards. A **run** is 4+ consecutive cards of one suit, with at least 3 natural cards. An ace can be low (A-2-3) or high (Q-K-A).
- **Red aces (1H, 1D) are wild**, but there can't be more wilds than naturals.
- If someone adds the natural card that a red ace stands in for, the natural card replaces it and the ace goes back to that player's hand.

**A turn**
- Draw from the deck or take the top discard.
- If you're not down, you may go down with exactly the round's setruns.
- Once down, you may add cards to any player's setruns ("hand building").
- Discard to end the turn.

**Claims (out of turn)**
- When the player in turn draws from the deck, everyone else except whoever discarded the card may claim the top discard.
- The first claimant in seat order after the player in turn gets it. The window closes as soon as that is settled, or after 6 seconds (`claimWindowMs`).
- The player in turn can go down and add cards meanwhile, but can't discard until the window closes.

**The deck running out**
- When the deck is empty, the discard pile (except the top card) is shuffled into a new deck, and its cards get new ids.
- When the deck runs out for the third time, the round ends after that turn with nobody out. This stops a round going on for ever once nobody can use the cards left.

**End of a round**
- A round ends as soon as a player's hand is empty.
- Cards left in hand score points: an ace is 25, 10 through King are 10, and other cards are their face value.

**How the old loop still in the UI differs**
- You always play first, as the last of the four seats.
- Only AI turns open a claim window, so nobody can claim on your turn.
- A player may claim back their own discard.
- There's no limit on how many times the deck is reshuffled.

## Architecture

### The engine (`src/engine/`)

TypeScript with no React, DOM or Redux, so it can also run on a server. Every function is pure:
- Time comes in as `now`.
- Randomness comes from a seeded generator whose state is in the game state (`random.ts`).
- A game replays exactly from its seed and its commands.

**`game.ts`**
- `createGame({names, seed})` deals round 1.
- `apply(state, seat, command, now)` returns `{ok, state}` or `{ok: false, error}` with a message fit to show a player.
- `expireClaims(state, now)` closes a claim window whose deadline has passed; the host calls it when the deadline comes.
- `startNextRound(state)` deals the next round.
- Every seat is the same. Whether a seat is a person or a bot is the host's business.
- Commands name cards by id: `draw`, `claim`, `pass`, `goDown`, `addToSetrun`, `discard`.
- `apply` copies the state with `structuredClone` and changes the copy, so a state object is never changed once made.

**`view.ts`**
- `viewFor(state, seat, now)` is what one seat may see: its own hand, other hands as card ids only, the deck as a count and the top card's id, the claim window, and a log in which other seats' deck draws hide the card.
- A view is JSON-safe, ready to send over a socket.

**`bot.ts`**
- `botMove(view)` returns a bot's next command, or null while it waits. A bot sees only its own view.
- It answers claim windows at once. On its turn it waits for any claim window to close, goes down when it can, adds one card per command, then discards.
- `scoreHand` is its heuristic. It picks the best partial and complete runs and sets for a requirement (20 points per card, plus 5 per nearby card that could extend a run).
- `planGoDown` re-checks each setrun with `checkSetrun`, because `scoreHand` only estimates.
- `worthTaking` stops the two take-and-throw-back loops the simulations found.

**`simulate.ts`**
- `simulateGame(seed, options)` plays a whole bot game with no timers.
- `simulate.test.ts` plays dozens of games for 2 to 6 players and checks every state against the rules: all 104 cards present once, valid setruns, scores and claim windows. Run it after changing rules or bots.

**`setruns.ts`**
- `checkSetrun(cards, type)` and `addToSetrun(setrun, card)` are the single source of truth for setrun validity.
- `explainSetrun(cards, type)` says in plain words why cards aren't a valid setrun yet, and returns `null` exactly when `checkSetrun` accepts them. The go-down dialog shows it.
- `sortHand` sorts by value or by suit.

**`cards.ts`** holds `Card`, `Setrun`, `SET`/`RUN`, `ROUND_REQUIREMENTS`, `createCard`, `isRedAce` and `getPoints`.

**`card-names.ts`** turns cards and setruns into text: `shortName` ("7♦"), `longName` ("Seven of diamonds", for screen readers), `setrunCaption` ("Run 3–6 ♦") and `requirementText` ("1 set + 1 run").

**`testing.ts`** has test shorthands: `card("10H")` and `cards("7C 7H 1D")`.

### The UI

- `src/components/game/` holds the presentational components. `game-table.jsx` lays out the table and works out what the human can do right now: valid setrun targets for the selected card (via `addToSetrun`), the gold "fits a meld" dots, the turn prompt, and whether the claim window is open. `go-down-dialog.jsx` keeps its slot picks in local state and only hands App the finished setruns.
- `src/components/ui/` holds shadcn/ui components (Radix based, added with `npx shadcn@latest add <name>`). They are copied into the repo to be edited: `button.jsx` sizes were raised so every button is at least 44px.
- **Animation** uses Motion (`motion/react`):
  - Every element that shows a card on the table is a `MovingCard` (`playing-card.jsx`) whose `layoutId` is the card's `id`. When a card moves between the deck, the discard pile, a hand and a setrun, its old element unmounts and a new one mounts, and Motion flies the card between them.
  - Render each card id in one place only, because Motion hides all but the newest element with a given `layoutId`. So the opponents' setruns and hands are rendered for the current layout only (`useMediaQuery` in `game-table.jsx`), and the go-down dialog uses plain `PlayingCard`s.
  - Opponents' hands are hidden. `HiddenHand` (`opponent-panel.jsx`) renders each of their cards as a tiny card back over their panel's card fan, or over their top-bar chip on short screens. Cards they draw fly in there and then fade out; cards they play fly out from there.
  - The deck's top card and the top two discards sit in `AnimatePresence`, so a card that leaves cross-fades into what it becomes (a face in your hand, a back in an opponent's).
  - In the hand, dnd-kit (`@dnd-kit/sortable`) does drag-to-reorder for mouse and touch, and Motion animates the lift, the sliding and the deal. `Hand` is keyed by round so each deal remounts it.
  - App wraps everything in `MotionConfig reducedMotion="user"`.
- Styling is Tailwind utility classes. The theme lives in `src/index.css`: colour tokens (felt green, gold for "you can act here", violet for wild-ace badges), the fonts, and card sizes as CSS variables (`--hand-w`, `--pile-w`, `--meld-w`) that scale with the viewport.
  - Rows of setruns never wrap: `MeldRow` (`meld.jsx`) lowers `--meld-w` until a player's setruns fit on one line, the way the hand's overlap grows with its size.
  - Two custom variants trim the layout for small windows: `compact:` (height 780px or less) and `short:` (height 560px or less, i.e. a phone in landscape).
  - A phone held upright gets a "turn your phone sideways" screen.

### The old loop (until the UI switches to the engine)

**One connected component.** `src/App.jsx` is the only component connected to Redux 5 (react-redux `connect`), and `mapStateToProps` passes the whole store in as `props.state`. App holds every event handler and defines every dispatcher inline in `mapDispatchToProps`. It renders the home screen, or the table plus the go-down and round-end dialogs, and passes its handlers to the table as one `tableActions` object. The human is `state.player` and the AIs are `state.AI.players`.

**State machine driven from `componentDidUpdate`.** `game.gameState` (values in `GAME_STATES`, `src/store/constants.js`) drives each turn:
- The human's turn is `PW_DRAW_CARD → PW_PLAY`, and it advances only through click handlers.
- Each AI's turn runs automatically: `AI_DRAW → AI_WAIT_ONE → AI_DRAW_OOT → AI_WAIT_TWO → AI_OOT_RESOLVE → AI_PLAY`.
- In `AI_PLAY`, an AI that is down keeps adding cards to setruns, one action per update, until it can't. Each step (`App.AIPlayStep`) runs `AI_PACE.move` after the last. Then `FROM_AI_TO_DISCARD` passes the turn to the next AI, or back to `PW_DRAW_CARD`.
- After each state change, `App.componentDidUpdate` checks whether the round has ended, runs the AI decision for the current state and dispatches the next action. It returns early when `props.state` hasn't changed. `setTimeout` delays from `AI_PACE` (`src/store/constants.js`) set the pace.

These pieces of state keep that loop working. Preserve them when you add a reducer case:
- `game.gameUpdate`: a case sets it to `true` only when `componentDidUpdate` should advance the AI loop. Every case sets it explicitly.
- `AI.messageUpdate`: an array of the AI indices whose speech bubble was just set; `componentDidUpdate` clears those bubbles 2 seconds later. `null` when no new message was set.
- `claimChoice`: the human's answer in the claim window, `"claim"` or `"pass"` (`null` until they answer), set by the UI-only actions `PLAYER_DRAW_OOT` and `PLAYER_PASS_OOT`. An answer ends the wait at once (`App.answerClaim` cancels the timer that `App.waitForClaim` set).

**Reducer.** `src/store/reducer.js` is a chain of `if (action.type === …)` blocks using `immutability-helper`'s `update` and lodash `cloneDeep`; `{$set: …}` belongs only inside an `update()` spec. Action types are in `src/store/actions.js`, and the state shape is in `src/store/initial-state.js`. The reducer is wrapped in `withLog` (`src/store/log.js`), whose `describeAction` turns actions into activity-log entries. `player.newCard` (`{id, label}`) marks the card the human just drew, claimed or got back.

**`src/game-functions/`** serves only this loop:
- `deck-functions.js` builds and deals decks with ids like `"10H-3-1"`.
- `AI-functions.js` adapts `engine/bot.ts` to the loop's state shape.
- `params.js` sets the number of players.

## Card model

A card is the object `createCard` (`src/engine/cards.ts`) returns:

```
{value: 1–13, suit: "C"|"D"|"H"|"S", displayString: "10H", id: "k3f9-17", ace?: {value: 1, suit, colour}}
```

- In the engine, `id` is the game's prefix and a number given in shuffled order, so it says nothing about the card. Cards are renumbered whenever they are shuffled, so nobody can follow a card through a shuffle. Otherwise an id stays with the physical card wherever it goes, including wild-ace copies and an ace returned from a setrun. The UI uses ids for React keys, Motion `layoutId`s and dnd-kit.
- `displayString` is also the image filename. Aces are `1`, and J/Q/K are `11`/`12`/`13`.
- Inside a setrun, a red ace is a copy whose `value` and `suit` are set to the card it stands in for. `card.ace` and `displayString` still identify it as the real ace.
- A high ace in a run is a copy with `value: 14`.
- Setruns are `{type: "SET"|"RUN", cards}`, with runs ordered by value.

**Vocabulary** used throughout the code:
- *setrun*: a meld.
- *go down*: lay down setruns that meet the round requirement.
- *table*: the setruns a player has laid down.
- *requirement*: the round's `{S, R}` pair.
- *seat*: a player's place at the table, 0-based, in turn order.
- *OOT*: out of turn (old loop).
- *PW*: the human player's turn (old loop).

## Leftovers

- `src/classes/` (`card.js`, `hand.js`) and the root `testing.js` are old standalone experiments. Nothing imports them, and they would throw if imported.
- `src/project notes.txt` is the author's TODO list.
