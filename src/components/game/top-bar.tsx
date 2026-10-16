import type {ReactNode} from 'react';
import {DropdownMenu} from 'radix-ui';
import {Check, CircleHelp, Maximize, Menu, Pause, Settings, Trophy} from 'lucide-react';
import {cn} from '@/lib/utils.ts';
import {canGoFullscreen, goFullscreen} from '@/lib/fullscreen.ts';
import {Button} from '@/components/ui/button.tsx';
import type {Card, Requirement} from '@/engine/cards.ts';
import type {CharacterId} from '@/engine/cast.ts';
import type {BotLevel} from '@/engine/levels.ts';
import {plural} from '@/engine/card-names.ts';
import {aiColor, portraitImage} from './players.ts';
import {HiddenHand} from './opponent-panel.tsx';
import {LevelTag} from './avatar.tsx';

/** An opponent as the top bar shows them on short screens. */
export interface OpponentChip {
    /** their opponent number, from 0 */
    index: number;
    name: string;
    count: number;
    isDown: boolean;
    /** their level, if a bot */
    level: BotLevel | null;
    /** who they are, if one of the cast */
    character: CharacterId | null;
    active: boolean;
    /** their cards' ids, set only on short screens, where their cards fly to and from here */
    cards: string[] | null;
    /** the cards in their hand everyone knows (knownCards) */
    known: Record<string, Card>;
}

function RequirementChip({met, children}: {met: boolean; children: ReactNode}) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-1 pr-3 pl-2 text-sm font-bold short:text-xs">
            {met
                ? <Check className="size-4 text-gold" strokeWidth={3} aria-label="done" />
                : <span aria-hidden="true" className="ml-1 size-2 rounded-full border-[1.5px] border-current" />}
            {children}
        </span>
    );
}

// On short screens the opponent panels don't fit, so opponents show here as
// chips, and their cards fly to and from the avatars. To leave room for the
// buttons, an opponent who is down gets a tick on their avatar, and on
// narrower phones the chips leave out the word "cards".
function OpponentChips({opponents}: {opponents: OpponentChip[]}) {
    return (
        <ul aria-label="Opponents" className="hidden gap-1.5 short:flex">
            {opponents.map(opponent => (
                <li
                    key={opponent.index}
                    className={cn(
                        "inline-flex h-8 flex-none items-center gap-1.5 rounded-full border-2 bg-panel pr-2.5 pl-0.5 text-xs font-bold whitespace-nowrap",
                        opponent.active ? "border-gold" : "border-transparent"
                    )}
                >
                    <span
                        aria-hidden="true"
                        className={cn("relative grid size-6 place-items-center rounded-full text-white", opponent.character && "size-6.5 p-0.5")}
                        style={{backgroundColor : aiColor(opponent.index)}}
                    >
                        {opponent.character
                            ? <img src={portraitImage(opponent.character)} alt="" draggable={false} className="block size-full rounded-full object-cover" />
                            : opponent.index + 1}
                        {opponent.isDown && (
                            <span className="absolute -right-1 -bottom-1 grid size-3.5 place-items-center rounded-full bg-cream text-cream-foreground">
                                <Check className="size-2.5" strokeWidth={4} />
                            </span>
                        )}
                        {opponent.cards && <HiddenHand ids={opponent.cards} known={opponent.known} className="top-0 left-1.5 w-3" />}
                    </span>
                    <span className="sr-only">{opponent.name}:</span>
                    {opponent.count}<span className="max-[820px]:sr-only"> cards</span>
                    {opponent.isDown && <span className="sr-only">, down</span>}
                    <LevelTag level={opponent.level} className="px-1.5 py-0 text-[10px]" />
                </li>
            ))}
        </ul>
    );
}

// You, as a chip like your opponents' (on short screens): your points so far.
function YouChip({points, active}: {points: number; active: boolean}) {
    return (
        <span className={cn(
            "hidden h-8 flex-none items-center gap-1.5 rounded-full border-2 bg-panel pr-2.5 pl-0.5 text-xs font-bold whitespace-nowrap short:inline-flex",
            active ? "border-gold" : "border-transparent"
        )}>
            <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-cream text-[9px] text-cream-foreground">You</span>
            <span className="sr-only">You:</span>
            {points} pts
        </span>
    );
}

interface MenuProps {
    onPause: () => void;
    onShowScores: () => void;
    onShowRules: () => void;
    onShowSettings: () => void;
}

const menuItem = "flex h-11 cursor-pointer items-center gap-3 rounded-lg px-3 font-bold outline-none select-none data-highlighted:bg-white/10 [&_svg]:size-4.5";

// On short screens the game's buttons go in a menu. It offers full screen
// too, on a phone that has left it.
function GameMenu({onPause, onShowScores, onShowRules, onShowSettings}: MenuProps) {
    return (
        // not modal, so a dialog opened from it gets the focus cleanly
        <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu" className="hidden flex-none short:inline-flex">
                    <Menu aria-hidden="true" className="size-5.5" />
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="start"
                    sideOffset={2}
                    className="z-50 min-w-44 rounded-xl border bg-popover p-1 text-popover-foreground shadow-2xl"
                >
                    <DropdownMenu.Item className={menuItem} onSelect={onPause}><Pause aria-hidden="true" />Pause</DropdownMenu.Item>
                    <DropdownMenu.Item className={menuItem} onSelect={onShowScores}><Trophy aria-hidden="true" />Scores</DropdownMenu.Item>
                    <DropdownMenu.Item className={menuItem} onSelect={onShowRules}><CircleHelp aria-hidden="true" />Rules</DropdownMenu.Item>
                    <DropdownMenu.Item className={menuItem} onSelect={onShowSettings}><Settings aria-hidden="true" />Settings</DropdownMenu.Item>
                    {canGoFullscreen() && (
                        <DropdownMenu.Item className={menuItem} onSelect={() => void goFullscreen()}>
                            <Maximize aria-hidden="true" />Full screen
                        </DropdownMenu.Item>
                    )}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}

interface TopBarProps extends MenuProps {
    /** from 0 */
    round: number;
    roundCount: number;
    requirement: Requirement;
    requirementMet: boolean;
    opponents: OpponentChip[];
    /** your points so far, and whether it's your turn (shown on short screens) */
    you: {points: number; active: boolean};
}

// Round, what this round needs, and pausing, the scores, the rules and the
// settings. On short screens it also has everyone at the table, as chips.
function TopBar({round, roundCount, requirement, requirementMet, opponents, you, onPause, onShowScores, onShowRules, onShowSettings}: TopBarProps) {
    return (
        <header className="grid h-15 min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-white/8 bg-black/34 px-6 short:flex short:h-11 short:gap-1.5 short:pr-1.5 short:pl-0">
            <GameMenu onPause={onPause} onShowScores={onShowScores} onShowRules={onShowRules} onShowSettings={onShowSettings} />
            <div className="truncate font-heading text-2xl font-extrabold tracking-tight short:hidden">Crafty Clara</div>
            <div className="flex items-center gap-3.5 short:flex-none short:gap-2">
                <span className="font-bold whitespace-nowrap short:text-sm">Round {round + 1} of {roundCount}</span>
                <span aria-hidden="true" className="h-5 w-px bg-white/25" />
                <span className="text-sm text-muted-foreground short:hidden">Need</span>
                {requirement.S > 0 && <RequirementChip met={requirementMet}>{plural(requirement.S, "set")}</RequirementChip>}
                {requirement.R > 0 && <RequirementChip met={requirementMet}>{plural(requirement.R, "run")}</RequirementChip>}
            </div>
            <span className="hidden flex-1 short:block" />
            <OpponentChips opponents={opponents} />
            <YouChip points={you.points} active={you.active} />
            <nav aria-label="Game" className="flex justify-end gap-2 short:hidden">
                <Button variant="outline" onClick={onPause}>
                    <Pause aria-hidden="true" />Pause
                </Button>
                <Button variant="outline" onClick={onShowScores}>
                    <Trophy aria-hidden="true" />Scores
                </Button>
                <Button variant="outline" onClick={onShowRules}>
                    <CircleHelp aria-hidden="true" />Rules
                </Button>
                <Button variant="outline" size="icon" aria-label="Settings" onClick={onShowSettings}>
                    <Settings aria-hidden="true" />
                </Button>
            </nav>
        </header>
    );
}

export default TopBar;
