import type {ReactNode} from 'react';
import {Check, CircleHelp, Trophy} from 'lucide-react';
import {cn} from '@/lib/utils.ts';
import {Button} from '@/components/ui/button.tsx';
import type {Requirement} from '@/engine/cards.ts';
import {plural} from '@/engine/card-names.ts';
import {aiColor} from './players.ts';
import {HiddenHand} from './opponent-panel.tsx';

/** An opponent as the top bar shows them on short screens. */
export interface OpponentChip {
    /** their opponent number, from 0 */
    index: number;
    name: string;
    count: number;
    isDown: boolean;
    active: boolean;
    /** their cards' ids, set only on short screens, where their cards fly to and from here */
    cards: string[] | null;
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
// chips, and their cards fly to and from the avatars.
function OpponentChips({opponents}: {opponents: OpponentChip[]}) {
    return (
        <ul aria-label="Opponents" className="hidden gap-1.5 short:flex">
            {opponents.map(opponent => (
                <li
                    key={opponent.index}
                    className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-full border-2 bg-panel pr-2.5 pl-0.5 text-xs font-bold whitespace-nowrap",
                        opponent.active ? "border-gold" : "border-transparent"
                    )}
                >
                    <span
                        aria-hidden="true"
                        className="relative grid size-6 place-items-center rounded-full text-white"
                        style={{backgroundColor : aiColor(opponent.index)}}
                    >
                        {opponent.index + 1}
                        {opponent.cards && <HiddenHand ids={opponent.cards} className="top-0 left-1.5 w-3" />}
                    </span>
                    <span className="sr-only">{opponent.name}:</span>
                    {opponent.count} cards{opponent.isDown && " · down"}
                </li>
            ))}
        </ul>
    );
}

interface TopBarProps {
    /** from 0 */
    round: number;
    roundCount: number;
    requirement: Requirement;
    requirementMet: boolean;
    opponents: OpponentChip[];
    onShowScores: () => void;
    onShowRules: () => void;
}

// Round, what this round needs, and the scores and rules.
function TopBar({round, roundCount, requirement, requirementMet, opponents, onShowScores, onShowRules}: TopBarProps) {
    return (
        <header className="grid h-15 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-white/8 bg-black/34 px-6 short:flex short:h-11 short:gap-2 short:px-3">
            <div className="truncate font-heading text-2xl font-extrabold tracking-tight short:hidden">Crafty Clara</div>
            <div className="flex items-center gap-3.5 short:gap-2">
                <span className="font-bold whitespace-nowrap short:text-sm">Round {round + 1} of {roundCount}</span>
                <span aria-hidden="true" className="h-5 w-px bg-white/25" />
                <span className="text-sm text-muted-foreground short:hidden">Need</span>
                {requirement.S > 0 && <RequirementChip met={requirementMet}>{plural(requirement.S, "set")}</RequirementChip>}
                {requirement.R > 0 && <RequirementChip met={requirementMet}>{plural(requirement.R, "run")}</RequirementChip>}
            </div>
            <span className="hidden flex-1 short:block" />
            <OpponentChips opponents={opponents} />
            <nav aria-label="Game" className="flex justify-end gap-2 short:gap-1">
                <Button variant="outline" onClick={onShowScores} className="short:size-11 short:px-0">
                    <Trophy aria-hidden="true" /><span className="short:sr-only">Scores</span>
                </Button>
                <Button variant="outline" onClick={onShowRules} className="short:size-11 short:px-0">
                    <CircleHelp aria-hidden="true" /><span className="short:sr-only">Rules</span>
                </Button>
            </nav>
        </header>
    );
}

export default TopBar;
