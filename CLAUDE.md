# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Crafty Clara is a browser card game, a contract-rummy variant played against bot opponents. It is built with Vite and React 19, styled with Tailwind CSS v4 and shadcn/ui, and animated with Motion. There is no backend yet: all game logic runs in the browser, and the site is static.

It is built so it can later be played online. Three layers talk only through messages:
- **`src/engine/`:** a TypeScript rules engine, with a seat-by-seat view of the game and bots that play from those views.
- **`src/host/`:** a host that runs the engine (in the page, for now), with bots as seats. Everything talks through a transport that behaves like a network.
- **`src/client/`** and the UI: your seat's view of the game, read through `useGame()`. Moves go to the host as commands.

A real server (with WebSockets, a lobby and reconnects) is the next big step; the host and the messages are meant to move onto it as they are.

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
npm run tournament -- --deals 200 --lineup normal,normal,normal,normal   # bots against each other (Node 22.12+)
```

- Vitest runs with `globals: true` and jsdom (set in `vite.config.js`), so tests use Jest-style `describe`/`it`/`expect` without importing them. jest-dom matchers are loaded in `src/setupTests.ts`. Tests that need no browser (the engine, host and client, and the UI's pure modules) start with `// @vitest-environment node`.
- `.oxlintrc.json` turns on `no-undef`. Undefined identifiers were the main source of runtime crashes in this codebase, so treat lint errors as real bugs.
- Everything in `src/` is TypeScript: `.ts`, or `.tsx` for files with JSX. `tsconfig.json`:
  - It is strict. The view and the commands are typed in the engine, so the components are checked against exactly what the host sends.
  - `erasableSyntaxOnly` rules out enums, namespaces and constructor parameter properties, so Node can run the engine just by stripping its types.
  - Type-only imports need `import type` (`verbatimModuleSyntax`).
- Imports include explicit extensions (`./hand.tsx`, `./game.ts`), except in the shadcn components. `@/` is an alias for `src/` (`vite.config.js`, `tsconfig.json`); the UI uses it.
- Card faces are half-size WebP images, `public/img/cards/<displayString>.webp`, loaded from Vite's base URL by `src/components/game/cards.ts`. Their full-size PNG sources are in `art/card-faces/`. The card back is drawn in CSS (`card-back` in `src/index.css`). The rest of `art/` is unused source card art; it is outside `public/` so it isn't copied into builds.

## Game rules

These are the engine's rules (`src/engine/game.ts`).

**Deck and rounds**
- Two 52-card decks, 12 cards per player, 2 to 6 players.
- There are 7 rounds. `ROUND_REQUIREMENTS` (`src/engine/cards.ts`) gives each round's requirement as `{S, R}`: the number of sets and runs a player must lay down to "go down".
- The first player moves one seat on each round. The lowest total after the last round wins.

**Setruns**
- A **set** is 3+ cards of one value, with at least 2 natural cards. A **run** is 4+ consecutive cards of one suit, with at least 3 natural cards. An ace can be low (A-2-3) or high (Q-K-A).
- **Red aces (1H, 1D) are wild**, but there can't be more wilds than naturals.
- A red ace playing as itself is a natural card, not a wild: in a set of aces, or as the ace (low or high) of a run in its own suit. So A♠ A♥ A♦ is a set, and A♥ 2♥ 3♥ 4♥ has no wilds.
- If someone adds the natural card that a wild stands in for, the natural card replaces it and the ace goes back to that player's hand. A red ace playing as itself is never swapped out.

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
- The next round is dealt once every player has said they're ready. Bots are ready at once.

In the game on the page, you are seat 0 of four, against "Opponent 1" to "Opponent 3".

## Architecture

### The engine (`src/engine/`)

TypeScript with no React or DOM, so it can also run on a server. Every function is pure:
- Time comes in as `now`.
- Randomness comes from a seeded generator whose state is in the game state (`random.ts`).
- A game replays exactly from its seed and its commands.

**`game.ts`**
- `createGame({names, seed})` deals round 1.
- `apply(state, seat, command, now)` returns `{ok, state}` or `{ok: false, error}` with a message fit to show a player.
- `expireClaims(state, now)` closes a claim window whose deadline has passed; the host calls it when the deadline comes.
- Every seat is the same. Whether a seat is a person or a bot is the host's business.
- Commands name cards by id: `draw`, `claim`, `pass`, `goDown`, `addToSetrun`, `discard`, and `ready` (for the next round).
- `apply` copies the state with `structuredClone` and changes the copy, so a state object is never changed once made.

**`view.ts`**
- `viewFor(state, seat, now)` is what one seat may see: its own hand, other hands as card ids only, the deck as a count and the top card's id, the claim window, and a log in which other seats' deck draws hide the card.
- A view is JSON-safe, ready to send over a socket.

**`bot.ts`**
- `botMove(view, profile)` returns a bot's next command, or null while it waits. A bot sees only its own view.
- A `BotProfile` is a level and a seed. There are two levels:
  - **Normal** plays its own hand.
  - **Hard** discards by points rather than face value, so it throws away useless black aces (25 points). It also reads the table (`clues.ts`), and of two discards worth about the same, throws the one nobody seems to want (`DANGER_WEIGHT`).
  - In tournaments Hard scores about 52 points a game fewer than Normal. Almost all of that comes from discarding by points.
  - Weighting danger more heavily, to hold high cards back from others, cost more points than it saved.
- It answers claim windows at once. On its turn it waits for any claim window to close, goes down when it can, adds one card per command, then discards. When a round ends it is ready for the next straight away.
- `scoreHand` is its heuristic. It picks the best partial and complete runs and sets for a requirement (20 points per card, plus 5 per nearby card that could extend a run). It tries each red ace both as a wild and as itself, and keeps the best reading.
- `planGoDown(hand, requirement, tables)` tries every way to go down with exactly the round's setruns: each red ace as itself or as a wild, with wilds filling gaps in runs. For each way, it plays out what it could then add to the tables, and keeps the one that leaves the fewest points in hand (plus `CARD_COST` a card). So it lays kings rather than 2s, and keeps back a set it can add to someone else's.
- `scoreHand` still guides what to collect and discard, but it is greedy and misses some ways to go down, so don't use it to decide whether the bot can go down.
- `worthTaking` stops the two take-and-throw-back loops the simulations found.

**`clues.ts`**
- `readClues(view, memory)` works out from the round's log what each other seat seems to want, from 0 to 1:
  - **Pickups count for:** taking a discard or claiming one.
  - **Count against:** throwing a card away, or drawing past it.
  - **What a card says depends on the round:** in a round of sets it points to the card's value, and in a round of runs to its neighbours in the suit. A mixed round splits the weight between the two.
  - **A seat that's down** wants whatever fits a setrun on the table.
- `danger(card)` is the chance a discard reaches someone it helps. The next player can take it; the others only by claiming it.
- **Memory:** a bot remembers each log entry with a chance that fades with each turn (`remembers`).
  - The seed decides which entries, so its choices don't flicker from one move to the next, and a game still replays exactly.
  - In tournaments, perfect memory was barely better than Hard's.

**`simulate.ts`**
- `simulateGame(seed, options)` plays a whole bot game with no timers.
- `simulate.test.ts` plays dozens of games for 2 to 6 players and checks every state against the rules: all 104 cards present once, valid setruns, scores and claim windows. Run it after changing rules or bots.
- Each seat is played by a `Player`, a function from a view to a command (`botMove` by default), so different bots can play each other.

**`tournament.ts`**
- `playTournament({lineup, deals})` plays each deal once for every rotation of the lineup, so every bot gets every seat and the same cards. It reports each bot's average score, win rate and how often it went out. With two bots it also gives the first one's edge, in points per game, with its standard error.
- Use it to check that a bot change really helps. An edge bigger than two standard errors is real; a few hundred deals usually gets there.
- `npm run tournament` runs it from `scripts/tournament.js`, which lists the bots by name. The script is plain JavaScript that Node runs with the engine's types stripped, so it needs Node 22.12+. `.oxlintrc.json` gives `scripts/` Node's globals.

**`setruns.ts`**
- `checkSetrun(cards, type)` and `addToSetrun(setrun, card)` are the single source of truth for setrun validity.
- Both go through the ways a group of cards can be read (`readings`): which red aces play as themselves and which are wilds.
- `explainSetrun(cards, type)` says in plain words why cards aren't a valid setrun yet, and returns `null` exactly when `checkSetrun` accepts them. The go-down dialog shows it.
- `sortHand` sorts by value (then suit) or by suit (then value). Suits go ♥ ♣ ♦ ♠, so the colours alternate.

**`cards.ts`** holds `Card`, `Setrun`, `SET`/`RUN`, `ROUND_REQUIREMENTS`, `createCard` and `getPoints`. For red aces it has:
- `isRedAce`: a red ace, which can be wild.
- `isWild`: a card in a setrun that is a red ace standing in for another card. Use it, not `isRedAce`, to count wilds.
- `asWild` and `asItself`: a red ace placed in a setrun as another card, and the ace back as itself.

**`card-names.ts`** turns cards and setruns into text: `shortName` ("7♦"), `longName` ("Seven of diamonds", for screen readers), `setrunCaption` ("Run 3–6 ♦") and `requirementText` ("1 set + 1 run").

**`testing.ts`** has test shorthands: `card("10H")` and `cards("7C 7H 1D")`.

### The host (`src/host/`)

TypeScript with no React or DOM. It is the "server" for a game, run in the page for now. A seat is whatever is at the other end of a port, and the host treats every seat the same.

- **`transport.ts`:** a `Port` is one end of a connection (`send`, `listen`, `close`). `createLocalPair` connects two ends in the page. Each message arrives a moment after it is sent, never during `send`, and as a copy made through JSON, as over a socket. A WebSocket can later be wrapped as a `Port`.
- **`protocol.ts`:** the messages. A seat sends `{type: "command", command}`. The host sends `{type: "view", view}` when the seat connects and after every change, or `{type: "refused", command, error}` to that seat alone.
- **`host.ts`:** `createHost({names, seed, clock})` holds the one true state and applies each seat's commands. It closes claim windows at their deadline with a timer and sends every seat its view after each change. It refuses a malformed command rather than throwing; it doesn't yet check commands' shape, which a real server will need.
- **`bot-player.ts`:** `startBot(port, {profile})` plays a seat through its port, seeing only its views. It pauses before each move (`BOT_PACE`) and then decides again on the latest view. A pause already under way isn't restarted by new views, so a stream of other players' moves can't hold up its claim answer. A claim answer refused because the window closed first is a normal race, not a bot bug.
- **`local-game.ts`:** `startLocalGame({name, levels})` seats you at seat 0 and a bot in every other seat, and returns your port, the host and `stop()`. `levels` gives each bot's level (normal by default). The bots' seeds come from the game's seed, so a seeded game replays exactly. `App.tsx` starts one per game. In development, `?seed=N` in the URL fixes the deal.
- **`clock.ts`:** the host, the bots and the local transport all take their time and timers from a `Clock`, `systemClock` by default. Tests use `createTestClock()` (`testing.ts`), which moves only when told to (`advance(ms)`, `runAll()`). So `local-game.test.ts` plays whole games, timers and all, in milliseconds, and a game replays exactly from its seed.

### The client (`src/client/`)

- **`game-client.ts`:** `createGameClient(port)` listens to your seat's port and keeps a snapshot, `{view, refusal}`: the latest view, and the last command the host refused (`{command, error, seq}`). Each message replaces the snapshot whole. `send(command)` sends a command.
- **`use-game.ts`:** `useGame(client)` reads the snapshot with `useSyncExternalStore` and returns `{view, refusal, send}`.

### The UI

Function components only; there is no global store.
- **`App.tsx`** shows the home screen, the pre-match screen (`new-game.tsx`, where you choose each opponent's level), or a game.
  - The levels are remembered in `localStorage`. Every read and write is wrapped in try/catch, so the screen still works where storage is blocked.
  - Dealing calls `startLocalGame` and `createGameClient`.
  - An effect stops the game's host and bots when the game ends or App unmounts. "New game" at the end goes back to the pre-match screen.
  - Each seat's level reaches `GameScreen` as `levels`, by seat. Hard opponents get a cream "Hard" tag on their panel, and on their top-bar chip on short screens. The engine's view doesn't know about levels: which seats are bots is the host's business.
- **`game-screen.tsx`** (`GameScreen`) reads the game with `useGame` and holds what is yours alone:
  - how your hand is laid out (`hand-order.ts`): kept sorted by value or by suit as cards come and go (by value to start), or in your own order once you drag a card. In your own order, arranged cards keep their places and new ones join on the right. A new deal is sorted again the way you last chose.
  - the selected card, by id
  - whether the go-down dialog is open
  - opponents' speech lines (`useSpeech`, which listens to the client for new log entries)
  - a refused move's message, shown in the turn prompt for a few seconds (`useNotice`)
  
  It works out what you can do (`yourTurn`), turns clicks into commands (`TableActions`), and renders `GameTable` and the go-down and round-end dialogs.
- **`your-turn.ts`** (`yourTurn(view, hand, selectedIndex)`) works out what you can do right now, with no React, so it is tested on its own:
  - where the selected card can go (via `addToSetrun`), and the gold "fits a meld" dots
  - what the deck and the discard pile do if clicked. While a claim window is open on your turn, you can't discard.
  - whether the go-down dialog can open. Nothing says whether your hand is ready to go down: spotting that is part of the game.
  - the turn prompt and its steps
- **`game-table.tsx`** lays out the table from the view and `yourTurn`'s answers. It holds no game logic.
- **`log-text.ts`** turns `view.log` into words: the activity panel, each opponent's last move, the "New" / "Claimed" / "Back" tag on the card you just got, and what players say after a move (`speechFor`). **`players.ts`** says where seats sit from your point of view. Opponents are numbered 1, 2, 3 in turn order after you, and each has a colour (`opponentSeats`, `opponentIndex`, `seatName`, `seatColor`).
- `go-down-dialog.tsx` keeps its slot picks in local state and only hands back the finished setruns, as indices into your hand.
- The round-end dialog's button sends `ready`. Once you are ready, it names who it's waiting for, which only shows in a game with other people.
- `src/components/ui/` holds shadcn/ui components (Radix based, added with `npx shadcn@latest add <name>`, which writes `.tsx`). They are copied into the repo to be edited: `button.tsx` sizes were raised so every button is at least 44px.
- **Animation** uses Motion (`motion/react`):
  - Every element that shows a card on the table is a `MovingCard` (`playing-card.tsx`) whose `layoutId` is the card's `id`. When a card moves between the deck, the discard pile, a hand and a setrun, its old element unmounts and a new one mounts, and Motion flies the card between them.
  - Render each card id in one place only, because Motion hides all but the newest element with a given `layoutId`. So the opponents' setruns and hands are rendered for the current layout only (`useMediaQuery` in `game-table.tsx`; on short screens their setruns are `CompactMelds`), and the go-down dialog uses plain `PlayingCard`s.
  - Opponents' hands are hidden: the view gives only their cards' ids. `HiddenHand` (`opponent-panel.tsx`) renders each id as a tiny card back over their panel's card fan, or over their top-bar chip on short screens. Cards they draw fly in there and then fade out; cards they play fly out from there.
  - The deck's top card (by the id in `view.deck.top`) and the top two discards sit in `AnimatePresence`, so a card that leaves cross-fades into what it becomes (a face in your hand, a back in an opponent's).
  - In the hand, dnd-kit (`@dnd-kit/sortable`) does drag-to-reorder for mouse and touch, and Motion animates the lift, the sliding and the deal. `Hand` is keyed by round so each deal remounts it.
  - App wraps everything in `MotionConfig reducedMotion="user"`.
- Styling is Tailwind utility classes. The theme lives in `src/index.css`: colour tokens (felt green, gold for "you can act here", violet for wild-ace badges), the fonts, and card sizes as CSS variables (`--hand-w`, `--pile-w`, `--meld-w`) that scale with the viewport.
  - Rows of setruns never wrap: `MeldRow` (`meld.tsx`) lowers `--meld-w` until a player's setruns fit on one line, the way the hand's overlap grows with its size.
  - Two custom variants trim the layout for small windows: `compact:` (height 780px or less) and `short:` (height 560px or less, i.e. a phone in landscape).
  - A phone held upright gets a "turn your phone sideways" screen.

## Card model

A card is the object `createCard` (`src/engine/cards.ts`) returns:

```
{value: 1–13, suit: "C"|"D"|"H"|"S", displayString: "10H", id: "k3f9-17", ace?: {value: 1, suit, colour}}
```

- `id` is the game's prefix and a number given in shuffled order, so it says nothing about the card. Cards are renumbered whenever they are shuffled, so nobody can follow a card through a shuffle. Otherwise an id stays with the physical card wherever it goes, including wild-ace copies and an ace returned from a setrun. The UI uses ids for React keys, Motion `layoutId`s and dnd-kit.
- `displayString` is also the image filename. Aces are `1`, and J/Q/K are `11`/`12`/`13`.
- Inside a setrun, a wild red ace is a copy whose `value` and `suit` are set to the card it stands in for. `card.ace` and `displayString` still identify it as the real ace. A red ace playing as itself keeps its own suit and `value` 1, or 14 when high (`isWild` tells them apart).
- A high ace in a run is a copy with `value: 14`.
- Setruns are `{type: "SET"|"RUN", cards}`, with runs ordered by value.

**Vocabulary** used throughout the code:
- *setrun*: a meld.
- *go down*: lay down setruns that meet the round requirement.
- *table*: the setruns a player has laid down.
- *requirement*: the round's `{S, R}` pair.
- *seat*: a player's place at the table, 0-based, in turn order.
- *view*: what one seat may see of the game (`viewFor`).
