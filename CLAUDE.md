# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Crafty Clara is a browser card game, a contract-rummy variant played against bot opponents. It is built with Vite and React 19, styled with Tailwind CSS v4 and shadcn/ui, and animated with Motion. There is no backend yet: all game logic runs in the browser, and the site is static. A service worker keeps the whole site on the device, so it can be installed and played offline.

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

- Vitest runs with `globals: true` and jsdom (set in `vite.config.js`), so tests use Jest-style `describe`/`it`/`expect` without importing them. jest-dom matchers are loaded in `src/setupTests.ts`, which also stubs `ResizeObserver` for Radix popovers. jsdom has no `matchMedia`, so a test sees the wide layout unless it calls `pretendShortScreen()` (`src/lib/testing.ts`), as `phone-table.test.tsx` and `go-down-dialog.test.tsx` do. Tests that need no browser (the engine, host and client, and the UI's pure modules) start with `// @vitest-environment node`.
- `.oxlintrc.json` turns on `no-undef`. Undefined identifiers were the main source of runtime crashes in this codebase, so treat lint errors as real bugs. It also keeps the layers apart (`no-restricted-imports`): the engine can't import the host, the client, the UI, storage or React, and the host can't import the client, the UI or storage, so both can move onto a server as they are.
- Everything in `src/` is TypeScript: `.ts`, or `.tsx` for files with JSX. `tsconfig.json`:
  - It is strict. The view and the commands are typed in the engine, so the components are checked against exactly what the host sends.
  - `erasableSyntaxOnly` rules out enums, namespaces and constructor parameter properties, so Node can run the engine just by stripping its types.
  - Type-only imports need `import type` (`verbatimModuleSyntax`).
- Imports include explicit extensions (`./hand.tsx`, `./game.ts`), except in the shadcn components. `@/` is an alias for `src/` (`vite.config.js`, `tsconfig.json`); the UI uses it.
- Card faces are half-size WebP images, `public/img/cards/<displayString>.webp`, loaded from Vite's base URL by `src/components/game/cards.ts`. Their full-size PNG sources are in `art/card-faces/`. The card back is drawn in CSS (`card-back` in `src/index.css`).
- The characters' portraits are 256px WebP crops of each head, mirrored to face right (into the table): `public/img/portraits/<id>.webp`. Their 1024px sources (AI-generated) are in `art/characters/`.
- Sound effects are short MP3s, `public/audio/<sound>.mp3`, one per moment (`sounds.ts`). They come from free (CC0) packs: Kenney's casino, interface and music jingle packs, and OpenGameArt. Each was converted to mono MP3 with its loudness evened out (ffmpeg `loudnorm`) by a script kept outside the repo, so to change one, convert the new source the same way.
- The rest of `art/` is unused source card art. `art/` is outside `public/`, so none of it is copied into builds.

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
- A red ace added to a run, or laid down with one, can often go at either end, and the player chooses which: on 9–K♥, as the 8♥ or as the A♥.

**The start of a round**
- Before anyone moves, everyone gets 30 seconds to look over their hand (`lookMs`). Play starts once every player has said they're ready, or when the time is up. Bots are ready at once.

**A turn**
- Draw from the deck or take the top discard.
- If you're not down, you may go down with exactly the round's setruns.
- Once down, you may add cards to any player's setruns ("hand building").
- Discard to end the turn.

**Claims (out of turn)**
- When the player in turn draws from the deck, everyone else except whoever discarded the card may claim the top discard.
- Everyone may ask for it, and the first claimant in seat order after the player in turn gets it, so you can ask and still miss out. The log's claim entry names who else asked (`beaten`).
- The window closes once everyone has answered; or once the claim is settled (the first in line has claimed it, say) and it has been open at least `claimShowMs`, so nobody sees it come and go in a flash; or after `claimWindowMs`, when anyone who hasn't answered passes. In the engine these are 0 and 6 seconds. The game on the page sets them by your game speed (`game-speed.ts`): 3, 2.5 or 2 seconds, and 10, 8 or 6 seconds.
- The player in turn can go down and add cards meanwhile, but can't discard until the window closes.

**The deck running out**
- When the deck is empty, the discard pile (except the top card) is shuffled into a new deck, and its cards get new ids.
- When the deck runs out for the third time, the round ends after that turn with nobody out. This stops a round going on for ever once nobody can use the cards left.

**End of a round**
- A round ends as soon as a player's hand is empty.
- Cards left in hand score points: an ace is 25, 10 through King are 10, and other cards are their face value.
- The next round is dealt once every player has said they're ready. Bots are ready at once.

In the game on the page, you are seat 0 of four, against three of the cast (`src/engine/cast.ts`): Clara, Alan, Julie, Steve, Gemma, Chris, Cis and Vena. You choose who, and each one's level.

## Architecture

### The engine (`src/engine/`)

TypeScript with no React or DOM, so it can also run on a server. Every function is pure:
- Time comes in as `now`.
- Randomness comes from a seeded generator whose state is in the game state (`random.ts`).
- A game replays exactly from its seed and its commands.

**`game.ts`**
- `createGame({names, seed, lookMs, now})` deals round 1.
- `apply(state, seat, command, now)` returns `{ok, state}` or `{ok: false, error, code}`, with a message fit to show a player. The `code` says whether the command came too late (`"late"`: an answer that crossed with the claim window closing, a start once play has started, anything said twice), which is nobody's fault, or broke the rules (`"illegal"`).
- **Commands from outside** are anything until checked: `parseCommand` (`commands.ts`) checks a command's shape and rebuilds it from only the fields it has, or says it isn't one. The host checks every command with it, so nothing made up gets into the game, its log, or what other seats are sent. The engine expects well-formed commands.
- **Deadlines:** a claim window closes at its deadline, and so does the time to look over your hand (`look`, phase `"look"`). `nextDeadline(state)` says when the next one is, and `expire(state, now)` closes whichever has passed; the host calls it when the deadline comes. A command that arrives after a deadline finds it already passed.
- **Look time:** with `lookMs` (none by default, so tests and simulations go straight to play), each deal starts in phase `"look"`. Nobody can move until play starts: when every seat has sent `start`, or at the deadline.
- Every seat is the same. Whether a seat is a person or a bot is the host's business.
- Commands name cards by id: `start` (ready to play, at the start of a round), `draw`, `claim`, `pass`, `goDown` (each run with an optional `from`: the value it starts at, for a run that could be laid out more than one way), `addToSetrun` (with `end`, `"low"` or `"high"`, for a card that could go at either end of a run), `discard`, and `ready` (for the next round).
- `apply` copies the state with `structuredClone` and changes the copy, so a state object is never changed once made.
- The state is plain JSON-safe data, so a game can be saved and carried on.
- **Versions.** The state carries its version (`STATE_VERSION`). A change to its shape bumps it and adds a step up from the version before (`upgrade.ts`), and `upgradeState` brings a saved game up to date by taking every step from its own version on. A state from a newer version than the code knows can't be carried on.
- Each seat keeps its points for each round played (`scores`) and whether it got down in each (`downs`). The game keeps who went out of each round (`outs`), so a finished game tells its whole story (for your history).

**`view.ts`**
- `viewFor(state, seat, now)` is what one seat may see: its own hand, other hands as card ids only, the deck as a count and the top card's id, the claim window, the look time (`startsIn`, `total` and who's ready), and a log in which other seats' deck draws hide the card.
- A view is JSON-safe, ready to send over a socket.

**`bot.ts`**
- `botMove(view, profile)` returns a bot's next command, or null while it waits. A bot sees only its own view.
- A `BotProfile` is a level, a seed, a risk tolerance (0 to 1) and who the bot is (`character`). A character's risk is their own (`cast.ts`), the same every game, so a player can get to know it. A bot that isn't one of the cast gets a random, secret risk for the whole game. There are two levels, each a set of traits (`LEVEL_TRAITS` in `levels.ts`): how well it remembers the table, if it reads it, and whether it discards by points, places its red aces and may hold off going down. `levels.ts` has nothing to load, so the new-game screen can list the levels (`BOT_LEVELS`) without loading the bots. A new level is a row there, a name and a line about it in `level-names.ts`, and an entry in `scripts/tournament.js`:
  - **Normal** plays its own hand.
  - **Hard** discards by points rather than face value, so it throws away useless black aces (25 points). It also reads the table (`clues.ts`), as an `Insight` passed to `scoreHand`, `wantsCard` and `chooseDiscard`:
    - It marks down unfinished setruns short of outs (`rated`, `OUTS_WEIGHT`). So it collects what it can still finish, not runs whose cards are gone or that others are collecting.
    - Of two discards worth about the same, it throws the one nobody seems to want (`DANGER_WEIGHT`).
  - In tournaments Hard scores about 87 points a game fewer than Normal. Discarding by points is worth about 50 of that, steering by outs about 24, and safer discards about 4.
  - Tried and dropped:
    - Weighting danger more heavily, to hold high cards back from others, cost more points than it saved.
    - Choosing where to lay wild aces, so fewer cards could swap them out, made no difference.
  - **Where a red ace goes** (`likedBest`): adding one to a run (`chooseEnd`), or going down with a run that could be laid out more than one way (`layOutRuns`), a hard bot picks the end that lets it add more of its own hand afterwards (holding the 7♥, the A♦ goes on 9–K♥ as the 8♥). Otherwise it picks the end that leaves the others fewer places to add (`openEnds`): nothing goes past an ace, nor where the bot knows both copies are gone. In tournaments this made no difference (+0.06 ± 0.45 points a game), but it's how a careful player lays an ace.
  - **Holding off going down** (`holdsOff`):
    - A hard bot may wait to go down, to keep its setruns hidden, but only while nobody else is down, only in rounds that need 9 cards or fewer, and never when going down lets it go out. The chance grows with its risk.
    - In tournaments this was neutral. Waiting in the later rounds too, where players often go down and out in one turn, cost about 5 points a game.
    - So it's personality, not strength: it may matter more against people, who read the table more than bots do.
    - Waiting for a better way to go down once someone else is down wasn't built. Once someone is down, a round ends within a few turns, and being caught costs about 100 points, so waiting rarely pays.
- It's ready to start as soon as a round is dealt, and answers claim windows at once. On its turn it waits for any claim window to close, goes down when it can, adds one card per command, then discards. When a round ends it is ready for the next straight away. A red ace it adds goes where `addToSetrun` puts it by default.
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
- `gone(value, suit)` counts copies out of reach: on the tables (a wild counts as its ace), and, as far as the bot remembers, discarded since the last reshuffle or taken by someone else. It doesn't count the bot's own hand or the discard on top.
- `outs(type, cards)` is how many cards still to be had would grow an unfinished set or run, each discounted by how much others want it.
  - The player just before you counts double, since they see most discards first and come ahead of you for every claim.
  - In tournaments, counting dead cards alone was worth about 14 points a game, and allowing for what others want about 8 more. Weighting the player before you double did no better than counting everyone the same.
- **Memory:** a bot remembers each log entry with a chance that fades with each turn (`remembers`).
  - The seed decides which entries, so its choices don't flicker from one move to the next, and a game still replays exactly.
  - In tournaments, perfect memory was barely better than Hard's.

**`simulate.ts`**
- `simulateGame(seed, options)` plays a whole bot game with no timers. Time jumps to the next deadline when every seat is waiting. `lookMs` gives each round its look time, and `silent` seats never answer a claim or start.
- `simulate.test.ts` plays dozens of games for 2 to 6 players and checks every state against the rules: all 104 cards present once, valid setruns, scores and claim windows. Run it after changing rules or bots.
- Each seat is played by a `Player`, a function from a view to a command (`botMove` by default), so different bots can play each other.

**`tournament.ts`**
- `playTournament({lineup, deals})` plays each deal once for every rotation of the lineup, so every bot gets every seat and the same cards. With two bots it also gives the first one's edge, in points per game, with its standard error. For each bot it reports:
  - its average score and win rate
  - how often it went out, and how often it got down
  - its points per round when it got down, and when it was caught without getting down
- Getting down is what matters most.
  - In tournaments a bot caught with its hand scores about 100–110 points that round, against 5–11 when it got down. So each extra point of "got down" is worth about 7 points a game.
  - Look at the down rate as well as the score: it tells a change that gets the bot down more often from one that only keeps its points low.
- Use it to check that a bot change really helps. An edge bigger than two standard errors is real; a few hundred deals usually gets there.
- `npm run tournament` runs it from `scripts/tournament.js`, which lists the bots by name. The script is plain JavaScript that Node runs with the engine's types stripped, so it needs Node 22.12+. `.oxlintrc.json` gives `scripts/` Node's globals.

**`setruns.ts`**
- `checkSetrun(cards, type, from?)` and `addToSetrun(setrun, card, end?)` are the single source of truth for setrun validity.
- `runLayouts(cards)` lists every way to lay out cards as a run, by the value each starts at. A spare wild can go below or above, and a red ace of the run's suit can be itself at one end or a wild at the other. The first is the one `checkSetrun` picks, and `from` picks another.
- `runEnds(setrun, card)` lists the ends of a run a card can go on, with the run it makes at each. A red ace can often go at either end, as itself at one and a wild at the other, or a wild at both. Without `end`, `addToSetrun` plays a card as itself if it can, and otherwise at the low end.
- Both go through the ways a group of cards can be read (`readings`): which red aces play as themselves and which are wilds.
- `explainSetrun(cards, type)` says in plain words why cards aren't a valid setrun yet, and returns `null` exactly when `checkSetrun` accepts them. The go-down dialog shows it.
- `sortHand` sorts by value (then suit) or by suit (then value). Suits go ♥ ♣ ♦ ♠, so the colours alternate.

**`cards.ts`** holds `Card`, `Setrun`, `SET`/`RUN`, `ROUND_REQUIREMENTS`, `createCard` and `getPoints`. For red aces it has:
- `isRedAce`: a red ace, which can be wild.
- `isWild`: a card in a setrun that is a red ace standing in for another card. Use it, not `isRedAce`, to count wilds.
- `asWild` and `asItself`: a red ace placed in a setrun as another card, and the ace back as itself.

**`cast.ts`** is the characters who sit at the table: each one's id, name, manner ("Dry and teasing", for choosing who to play), risk and honesty, and what their lines ask for, if anything in particular (`asksFor`: Chris's puns get groans). A character keeps the same personality from game to game, so a player can learn them. `dealCast` picks a line-up at random.

**Table talk** (`talk.ts`, with the lines in `lines.ts`, looked up in `catalogue.ts`):
- **Who speaks.** A character bot talks from its own view, as it plays, so it never says what it couldn't know: about its own hand, and what everyone can see.
  - `talkAbout(before, view, talker)` looks at what's new since the bot's last view: the deal, or a move (drawing, taking a discard, discarding, a claim, going down, adding to its setrun, a red ace shown, a reshuffle, someone going out, the end of the game). While someone else plays, a bot may pass the time ("Whose go is it?").
  - `answer(heard, view, talker)` answers a line it heard.
  - At most one line a view, each with a chance.
- **Who reacts.** Every bot sees the same log, so they agree without a word on who reacts to a move (`chosen`): one seat, picked from a key made of the round, the move's place in the log, and the game's card-id prefix. When the lot falls on a person, nobody does.
- **About its hand** (`claim`, from `feel`: ready or nearly, a long way off, or between), as the character's `honesty` goes:
  - honest (Alan, Gemma, Cis), mostly honest (Julie), or random (Chris)
  - a bluffer who moans most when nearly down (Clara)
  - a boaster whatever the hand (Steve)
  - one who gives nothing away (Vena)
  So the talk is something a player can learn to read.
- **Lines that ask for an answer** (`invites`):
  - blaming the dealer gets the dealer's answer
  - a remark at someone gets their comeback
  - talk about a hand gets doubt from one of the others
  - Chris's puns get groans
  A line can carry the answers written for it (`replies`), a set piece. Answers ask for none.
- **The lines** (`lines.ts`) are each character's own, by moment, about 400 in all. A name appears only to address someone ("Get you, {name}."), so a line said to you can leave yours out. A test checks this.
- **Said by id** (`catalogue.ts`). Every line has an id made of who says it, the moment and a short hash of its words (`clara.dealBlame.1x9k2fq`), so it stays the same while the lines around it change. A seat sends a `Line`, `{id, to?, card?, re?}`, never words:
  - Everyone looks the line up: its words, whether it's `big`, and what it asks for (`meaning`). An answer (`re`, the line it answers) asks for nothing, and is as big as what it answers.
  - The host checks it (`parseLine`): a line of the catalogue, the speaker's own if it's a character's, said to another seat, naming a card by its short name.
  - Each seat fills in the names from where it sits, leaving out its own (`lineText`). So a bot needn't know what you're called.
  - The answers written for a line (`replies`) are lines of their own, `<id>.re.<hash>`, which anyone may give.
  - Changing a line's words makes it a new line, so the bots may say it again soon.
- **Not repeating.** A bot keeps off lines heard this game and lately (`used`, seeded from `recentLines`), and when it has said them all, says the one heard longest ago.
- **Big moments.** Lines at big moments (going down, going out, the end of a round or game) are marked `big`, so they show even when the talk is turned down.

**`card-names.ts`** turns cards and setruns into text: `shortName` ("7♦"), `longName` ("Seven of diamonds", for screen readers), `setrunCaption` ("Run 3–6 ♦") and `requirementText` ("1 set + 1 run").

**`testing.ts`** has test shorthands: `card("10H")` and `cards("7C 7H 1D")`.

### The host (`src/host/`)

TypeScript with no React or DOM. It is the "server" for a game, run in the page for now. A seat is whatever is at the other end of a port, and the host treats every seat the same.

- **`transport.ts`:** a `Port` is one end of a connection (`send`, `listen`, `onClose`, `close`). `createLocalPair` connects two ends in the page. Each message arrives a moment after it is sent, never during `send`, and as a copy made through JSON, as over a socket. Closing, from either end, reaches both ends after the messages already on their way, and nothing more is sent. A WebSocket can later be wrapped as a `Port`.
- **`protocol.ts`:** the messages, in a version of their own (`PROTOCOL`; bump it with any change an older seat or host would misread).
  - A seat says `{type: "hello", protocol}` first. The host answers `{type: "welcome", protocol, seat, seats}`, then the view. `seats` is who sits where (`SeatInfo`: a bot's level, null for a person, and their character), which the screen reads from the client. To a seat in another version it says `{type: "mismatch", protocol}` and hangs up, and the screen asks for a reload: a page left open from before an update can't follow a game online. Nothing a seat sends before hello counts.
  - Then a seat sends `{type: "command", command}`, or a line of table talk, `{type: "say", line}` (a `Line`, by id).
  - The host sends `{type: "view", view}` after every change, or `{type: "refused", command, error, code}` to that seat alone.
  - It passes each line on to every seat as `{type: "said", seat, line, round, after}`. `after` is how many of the round's log entries came before it. Talk isn't part of the game: it changes nothing and isn't saved. The host drops a line the speaker couldn't say (`parseLine`), or that comes too soon after the same seat's last (`TALK_GAP_MS`).
- **`host.ts`:** `createHost({names, seats, seed, clock, lookMs})` holds the one true state and applies each seat's commands. It closes claim windows and starts play at their deadlines with a timer (`nextDeadline`), and sends every welcomed seat its view after each change. Nothing a seat sends is trusted: it refuses a command that isn't one (`parseCommand`, code `"malformed"`), ignores a message that isn't one, and stops sending to a seat that hangs up (`onClose`). Given a `state`, it carries on that game instead of dealing one, and `onChange` hears of every change, to save the game.
  - **Journal:** it keeps everything that changed the game since it took it on (`journal()`: the state it started from, then each command applied, each deadline passed and each change to the claim times, with when), and `replay(journal)` gives the state they lead to. It's in memory only, for now: for a bug report, or a server checking a game.
- **`bot-player.ts`:** `startBot(port, {profile})` plays a seat through its port, seeing only its views. It pauses before each move (`pace`, `BOT_PACE` by default; a function, for a pace that can change mid-game) and then decides again on the latest view. A pause already under way isn't restarted by new views, so a stream of other players' moves can't hold up its claim answer. It says hello as it starts. A move refused as `"late"` (a claim answer after the window closed, a start after play had) is a normal race, not a bot bug.
  - A bot that's one of the cast talks too (`talk.ts`), a moment after what it talks about, or after a line it answers (`TALK_PACE`).
  - It keeps a passing remark to itself if anyone has spoken in the last few seconds (`QUIET_MS`). A big moment's line, or an answer, goes anyway.
  - It never waits on its talk to move.
- **`game-speed.ts`:** how quickly a game against the bots goes, at each `GameSpeed` (relaxed, normal or quick): the bots' pace, and how long you have to claim a discard (10, 8 or 6 seconds). It's kept apart from the host and the bots, so the settings can show it without loading them.
- **`local-game.ts`:** `startLocalGame({name, cast, levels, speed})` seats you at seat 0 and a bot in every other seat, and returns your port, the host, who sits in each seat (`seats`), `setSpeed()`, `pause()`/`resume()` and `stop()`. `setSpeed` changes the bots' pace at once, and the claim windows from then on (`host.setClaimTimes`). A saved game carried on goes at the speed it's started with. `cast` gives who each bot is, and their names; without it the bots are "Opponent 1" and so on, as in most tests. `levels` gives each bot's level (normal by default). Each round starts with `LOOK_MS` (30 seconds) to look over your hand. The bots' seeds come from the game's seed, so a seeded game replays exactly. A game starts through `src/session.ts`, one per game. In development, `?seed=N` in the URL fixes the deal.
  - **Saving:** `onChange` is given a `LocalGameSave` as the game starts and after every change: the state, the bots' profiles (with their secret risks), and the game's time (`savedAt`). `from` carries on a save. A deadline (a claim window's, or play starting) is a time on the clock of the game that saved it, so `carryOn` gives it the time it had left. A save from before look time (no `look` or `lookMs`) carries on without it.
- **`clock.ts`:** the host, the bots and the local transport all take their time and timers from a `Clock`, `systemClock` by default.
  - A local game wraps its clock in `createPausableClock`, so pausing stops everything at once. Timers wait, and time spent paused doesn't count, so a claim window keeps the time it had left.
  - Pausing a game with other people will need a host command and their say. Tests use `createTestClock()` (`testing.ts`), which moves only when told to (`advance(ms)`, `runAll()`). So `local-game.test.ts` plays whole games, timers and all, in milliseconds, and a game replays exactly from its seed.

### Storage (`src/storage/`)

What's kept between visits, behind a layer each platform fills in its own way:
- **`store.ts`:** a `KeyValueStore` (async `get`, `set` and `remove` of JSON values). `browserStore` uses localStorage, and `memoryStore` is for tests. An app build would add one for the phone's own storage. It's async because everything but localStorage is. A store that can't keep something lets it go quietly.
- **On top of it:**
  - **`saved-game.ts`:** the game in progress. Saves are written one at a time, and one waiting its turn is replaced by any newer one. The game's state is brought up to date as it loads (`upgradeState`), and a bot whose level or character this build doesn't know plays as normal, or as nobody in particular. The save around the state has a version of its own (`VERSION`), for a change that can't be read the old way, and a save from another one is dropped.
  - **`history.ts`:** your finished games, for stats (up to 1000). A `GameRecord` is what happened (each player's level and character, scores and downs by round, and who went out), not totals, with an `id` of its own so a copy kept elsewhere later isn't counted twice, so stats can be worked out in new ways later. This is the player's history, so a change to the record needs a way to read old versions, not a reset. `list` waits for any game still being added, so the game just finished is in it.
  - **`heard-lines.ts`:** the lines of table talk heard lately (the newest 300), by id, so the cast keep off them next game.
  - **`settings.ts`:** your choices kept for next time: who you play (`cast`) and the opponents' levels, and your `Preferences`, read as one (`preferences()`) and written a change at a time (`setPreferences(changes)`): your `Hints` (each on or off), how much table talk you see (`TalkLevel`: off, quiet for just the big moments, or chatty, the default), the game speed, and whether there's sound. Each preference has a key of its own, and one never chosen, or no longer understood, is its default (`DEFAULT_PREFERENCES`).
- **`platform.ts`** builds these on the browser's store. It's the one place to swap: an app build would give them the phone's storage, and online play would keep saves and history on the server.

**`src/session.ts`** (loaded with the game screen) starts a local game and keeps it as it goes. It saves after every change, and when the game ends it forgets the save and adds the game to your history, once. It gives the bots the lines heard lately, and keeps each line said as heard.

### The client (`src/client/`)

- **`game-client.ts`:** `createGameClient(port)` says hello, listens to your seat's port and keeps a snapshot, `{status, seats, view, refusal, talk}`: whether you're connected (`connecting`, `open`, `closed`, or `mismatch` when the host speaks another version), who sits where (from the welcome), the latest view, the last command the host refused (`{command, error, code, seq}`), and the table talk this round. Each line is numbered (`seq`), in words as you hear them (`text`, names filled in from where you sit), and says whether it's `big`. Each message replaces the snapshot whole. `send(command)` sends a command, and `close()` hangs up.
- **`use-game.ts`:** `useGame(client)` reads the snapshot with `useSyncExternalStore` and returns it with `send`.

### The UI

Function components only; there is no global store.
- **`App.tsx`** shows the home screen, the pre-match screen (`new-game.tsx`, where you choose who you play and each one's level), your stats (`stats-screen.tsx`), or a game.
  - **Who you play:** three of the cast, at random the first time, then whoever you last chose. Each opponent's row on the new-game screen shows their portrait, name, manner and seat. Change opens the whole cast (`cast-picker.tsx`), with anyone already at the table greyed out.
  - The levels and your preferences are remembered (`settings`), and so is a game in progress (`savedGame`). App holds the preferences as one object (`prefs`), and hands it and `onPrefsChange` to the home screen and the game, which hand them to Settings. A change is kept at once; a new speed goes to the game in progress, and turning sound on unlocks it. The preferences kept from last time are read as the page opens, and don't undo a change made meanwhile. With a saved game, the home screen offers "Continue game" first, and dealing a new one replaces it.
  - The home screen has Your stats and Settings in a corner: top right, or on a phone top left as icons, clear of the title. Settings (`settings-dialog.tsx`) holds the game's settings (game speed, table talk and sound effects) beside the hints on a wide screen, each with a picture; on a phone it's a sheet that fills the screen. It opens from the game too (the top bar, or the ☰ menu on a phone), and holds the game while it's open.
  - **Stats** are worked out from your history (`stats.ts`, pure and tested on its own). The lowest total wins, and a tie for the lowest counts as a win, as on the game-over screen. You beat an opponent when you finish on a lower total. The stats screen is one page on a big screen, and three tabs (Overview, Rounds, Games) on a phone.
  - Dealing (or continuing) calls `startSession`. The game (`session.ts`, `GameScreen`, the host and the bots) is a separate download (`loadGame`, `React.lazy`), fetched once the home screen is up, so the home screen loads first. If it can't be fetched when you deal (offline before the service worker has it, or a new deploy has replaced the files), the page reloads.
  - **Offline:** `vite-plugin-pwa` (`vite.config.js`) builds a service worker that precaches the whole site, card faces included. `src/index.tsx` registers it by hand, so an update never reloads the page under a game. A new version takes over as soon as it's installed (`skipWaiting`, `clientsClaim`), not when every tab and the installed app have closed, which on a phone might be never; a page already open keeps the code it has, and has the new version the next time it opens. The card faces are preloaded only once the service worker has them (`preloadCardImages`), so a first visit doesn't download them twice. The app icons aren't precached: the browser fetches them itself. Once installed, the page asks the browser to keep its storage (`navigator.storage.persist`). Both are web-only, and an app build would leave them out.
  - An effect stops the game's host and bots when the game ends or App unmounts. "New game" at the end goes back to the pre-match screen.
  - `GameScreen` hears who sits in each seat from the client (`seats`, from the host's welcome), as it would online. A character's portrait (`Avatar`, in `avatar.tsx`) sits in a ring of their seat's colour wherever the opponent's numbered badge would: their panel, their top-bar chip and meld place on a phone, and the scoreboard. A bot that isn't a character (from a game saved before the cast) keeps its number. An opponent above Normal has a cream tag with their level (`LevelTag`, named in `level-names.ts`) on their panel, on their top-bar chip on short screens, and on the stats screen. The engine's view doesn't know about levels: which seats are bots is the host's business.
- **`game-screen.tsx`** (`GameScreen`) reads the game with `useGame` and holds what is yours alone. Its hooks are in `screen-hooks.ts`; the sounds and the lost-claim notice each look at what a new view changed (`useViewChange`).
  - how your hand is laid out (`hand-order.ts`, `useHandOrder`): kept sorted by value or by suit as cards come and go (by value to start), or in your own order once you drag a card. In your own order, arranged cards keep their places and new ones join on the right. A new deal is sorted again the way you last chose.
  - the selected card, by id
  - the run the selected card asks which end of (`choosing`): a card that could go at either end of a run asks first (`runEnds`), in a popover over the run (`EndChooser` in `meld.tsx`), whether it was clicked onto the run or dropped there. On a phone it opens beside the run, where there's room.
  - the countdown to play starting (`useLookTime`): what each view says, counted down a second at a time between views, and standing still while the game is held. It's kept here so a prompt mounted afresh, when the layout changes, carries on from the same time.
  - whether the go-down dialog is open
  - the table talk you see (as much as your `TalkLevel` allows), and what each opponent is saying now (`useBubbles`). A line stays up long enough to read, in a `SpeechBubble` (`speech-bubble.tsx`) that pops from the speaker's portrait. On a wide screen it drops from their panel over their melds, and goes in the activity in italics. On a phone it sits beside their portrait in their meld place. While the round-end dialog covers the table, it shows beside their name on the scoreboard.
  - a refused move's message, shown in the turn prompt for a few seconds (`useNotice`), or, when someone ahead of you in line got a discard you asked for too, who (`useLostClaim`)
  - whether the game is paused, and whether the Scores, Rules or Settings dialog is open. The game is held (`pause()` on the game) while any of these is true, and the claim countdown stops meanwhile:
    - The top bar's Pause button opens the Paused dialog (`pause-dialog.tsx`), whose Resume carries on.
    - Leaving the page (another tab, or another app on a phone) pauses the game the same way, so you come back to the Paused dialog. Not between rounds, though, and not while a dialog is open, since that's already holding the game.
    - Scores, Rules and Settings hold the game only while they're open.
  - the card being dragged, which counts as the selected card while it's dragged
  
  - **The game's sounds** (`useSounds`): for what's new in each view since the last (`soundsFor` in `sounds.ts`, pure and tested), a sound, played through the Web Audio API (`src/lib/audio.ts`).
    - The sounds: the deal, drawing, taking the discard, discarding, adding to a meld, going down, a claim out of turn, your turn, and the end of a round or game, by how it went for you.
    - A moment with no volume in `VOLUME` is quiet.
    - A browser only lets a page make sound after a tap, so App unlocks it (`unlockAudio`) from the tap that deals, or that carries on a game.
  It works out what you can do (`yourTurn`), turns clicks into commands (`TableActions`), and renders `GameTable` and the go-down and round-end dialogs. Every piece of the table reads the game from `TableContext` (`table-context.ts`, with `useTable()`): the view, the seats, your hand as you've arranged it, `yourTurn`'s answers and the actions.
- **`your-turn.ts`** (`yourTurn(view, hand, selectedIndex, hints)`) works out what you can do right now, with no React, so it is tested on its own:
  - where the selected card can be played (`targets`)
  - what the deck and the discard pile do if clicked. While a claim window is open on your turn, you can't discard.
  - whether the go-down dialog can open
  - three hints, each with its own switch in Settings:
    - **Cards that fit a meld** (on by default): once you're down, a gold dot on each card in your hand that fits a setrun on the table (`playable`).
    - **Where a card can go** (on by default): the setruns the selected (or dragged) card fits light up gold (`lit`, via `addToSetrun`), the rest are dimmed, and the prompt says what the card would do there. With it off, every setrun takes the card, unlit, and the prompt doesn't say where it fits: the host refuses a card that doesn't fit ("That card doesn't fit there").
    - **When you can go down** (off by default): Go down glows gold (`pulse-gold`) and the prompt says so, once your hand has what the round needs (`goDown.ready`, from `planGoDown`). Spotting that is part of the game, so it's off unless you turn it on.
  - the turn prompt and its steps, and a brief prompt for the status line on a phone
  - at the start of a round (`look`), who starts it and who you're waiting for. `LookPrompt` (`look-prompt.tsx`) shows it with a ring counting down and a Ready button: in place of the turn prompt, or on a phone as a panel over the empty meld places. The opponents' panels say "Ready" or "Looking at their hand".
- **`game-table.tsx`** lays out the table from the view and `yourTurn`'s answers. It holds no game logic. Both layouts share the pieces of your seat (`your-seat.tsx`: `YourHand`, `YourLookPrompt` and `GoDownButton`). Short screens (560px high or less: a phone held sideways) get **`phone-table.tsx`** instead:
  - The top bar holds everyone as chips, with your points in a "You" chip. Pause, Scores, Rules, Settings and Full screen go in a ☰ menu.
  - A status line under it says what an opponent last did or said, and what you can do (`brief`).
  - Every player's melds have a fixed place in a grid two rows high (`seatPlaces` in `players.ts`): you at the bottom left, the others round clockwise in turn order. A player who isn't down has a dashed "Not down yet" place, where your own shows a Go down button while you can go down. Melds stay on one line, their cards sized to the place's height (`--meld-w-full`, with `cqh` units).
  - The deck and the discard pile are stacked, overhanging the right edge.
  - Your hand is an arch along the bottom edge, showing only the top of each card (`arch.ts`, `--hand-show`). However many cards you hold, each card's corner (value and suit) stays on the screen.
  - Its root is `overflow: clip`, not `hidden`: the browser can scroll a `hidden` box to show a card you tap, and the hand and piles hang off the edges.
- **`log-text.ts`** turns `view.log` into words: the activity panel, each opponent's last move, the "New" / "Claimed" / "Back" tag on the card you just got, and the table talk among the moves, where it was said (`activityEntries(view, talk)`). **`players.ts`** says where seats sit from your point of view. Opponents are numbered 1, 2, 3 in turn order after you, and each has a colour (`opponentSeats`, `opponentIndex`, `seatName`, `seatColor`). Before a game, it says what each opponent's seat means (`seatNote`, `seatQuestion`).
- `go-down-dialog.tsx` keeps its slot picks in local state (`useSlots`) and only hands back the finished setruns, as indices into your hand. What the cards in each slot make, and which card would finish one, is worked out in `go-down-slots.ts`, pure and tested. One `Slot` and one `HandPicker` serve both layouts (`compact`, `arched`). A run that could be laid out more than one way (`runLayouts`) shows each, by the values it would go between ("10–K ♥", "J–A ♥"), and the chosen one goes down (`from`). On a phone it's a sheet that fills the screen: the slots across the top, your hand in the arch along the bottom.
- The round-end dialog's button sends `ready`. Once you are ready, it names who it's waiting for, which only shows in a game with other people. On a phone it fills the screen, with the result on the left and a compact `Scoreboard` on the right. At the end of the game it shows your record (wins, games, and where you finished in the last ten, this game ringed: `PlaceStrip`) once `GameScreen` has your history, and offers Your stats beside New game. What it says about the round is worked out in `round-summary.ts`, tested on its own.
- `src/components/ui/` holds shadcn/ui components (Radix based, added with `npx shadcn@latest add <name>`, which writes `.tsx`). They are copied into the repo to be edited: `button.tsx` sizes were raised so every button is at least 44px, and `DialogContent` takes `sheet` for a dialog that fills a phone's screen. `segmented-control.tsx` is our own: a choice of a few, as a row of buttons with the chosen one in cream (the hand's sort, the settings' choices, the opponents' levels).
- **Animation** uses Motion (`motion/react`):
  - Every element that shows a card on the table is a `MovingCard` (`playing-card.tsx`) whose `layoutId` is the card's `id`. When a card moves between the deck, the discard pile, a hand and a setrun, its old element unmounts and a new one mounts, and Motion flies the card between them.
  - Render each card id in one place only, because Motion hides all but the newest element with a given `layoutId`. So the table is rendered for the current layout only (`useMediaQuery` in `game-table.tsx` picks the wide layout or `PhoneTable`).
  - The go-down dialog's cards fly between your hand and the slots too. Each opening wraps them in a `LayoutGroup` with an id of its own, which keeps their `layoutId`s apart from the table's. A card in a slot leaves its place in the hand empty (an invisible card), so the rest of the hand doesn't close up.
  - Opponents' hands are hidden: the view gives only their cards' ids. `HiddenHand` (`opponent-panel.tsx`) renders each id as a tiny card back over their panel's card fan, or over their top-bar chip on short screens. Cards they draw fly in there and then fade out; cards they play fly out from there. A card everyone saw them take (from the discard pile, a claim, or a wild ace they took back: `knownCards` in `log-text.ts`) keeps its face as it flies in.
  - Cards fly at the game speed (`flight.ts`, provided by `GameScreen` through `FlightContext`). Quick is a short spring. Normal and Relaxed ease in slowly, so a card stays big enough to read near where it came from before it glides away. A card flying into an opponent's hand stays in sight a little longer at slower speeds (`linger`). Your own hand always moves at the quick pace: you know what you did.
  - A card is raised above the table only while it flies in from somewhere else: an animation that starts as its element appears. A card that only shifts along (a hand rearranged, a run growing) keeps its place among its neighbours.
  - The deck's top card (by the id in `view.deck.top`) and the top two discards sit in `AnimatePresence`, so a card that leaves cross-fades into what it becomes (a face in your hand, a back in an opponent's).
  - dnd-kit does the dragging, for mouse and touch. `TableDnd` (`table-dnd.tsx`) wraps the whole table:
    - **Targets:** a card from the hand can be dropped back in the hand to reorder it (`@dnd-kit/sortable`), on the discard pile to discard it, or on a meld it fits to add it. The drop targets' ids are in `drop-targets.ts`.
    - **Highlights:** while dragged, the card counts as the selected one, so the table lights up where it can go. A drop anywhere else puts it back.
    - **Following the pointer:** dnd-kit's sortable only moves the dragged card while it's over the hand, so `HandCard` follows the pointer itself (`useDndMonitor`).
    - **After a drop:** a card played by a drop stays where it was dropped (`PlayedCard`) and is measured there, so Motion flies it on from that spot without a jump back into the hand.
  - Motion animates the lift, the sliding and the deal. `Hand` is keyed by round so each deal remounts it.
  - App wraps everything in `MotionConfig reducedMotion="user"`.
- Styling is Tailwind utility classes. The theme lives in `src/index.css`: colour tokens (felt green, gold for "you can act here", violet for wild-ace badges, `cream-foreground` for words on cream), a `section-label` utility for the small capitals over a part of a screen, the fonts, and card sizes as CSS variables (`--hand-w`, `--pile-w`, `--meld-w`) that scale with the viewport.
  - Rows of setruns never wrap: `MeldRow` (`meld.tsx`) lowers `--meld-w` until a player's setruns fit on one line, the way the hand's overlap grows with its size.
  - Two custom variants trim the layout for small windows: `compact:` (height 780px or less) and `short:` (height 560px or less, i.e. a phone in landscape). Code that needs to know asks `useShortScreen()` (`src/lib/use-media-query.ts`, whose `SHORT_SCREEN` must match the variant). `short:` styles the pieces `PhoneTable` shares with the wide table (the top bar, the piles, the melds).
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
