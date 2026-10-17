import type {ComponentProps} from 'react';
import {cn} from '@/lib/utils.ts';
import {Button} from '@/components/ui/button.tsx';
import Hand from './hand.tsx';
import LookPrompt from './look-prompt.tsx';
import {newCardTag} from './log-text.ts';
import {useTable} from './table-context.ts';
import {useLookLeft, type LookClock} from './screen-hooks.ts';

// The pieces of your seat that both layouts of the table show (GameTable and
// PhoneTable), each from the table it's part of.

/** Your hand, a fresh one each deal: a row, or on a phone an arch along the bottom edge. */
export function YourHand({arched = false}: {arched?: boolean}) {
    let {view, hand, turn, actions} = useTable();
    return (
        <Hand
            key={view.round}
            arched={arched}
            cards={hand}
            selected={turn.selected?.index ?? null}
            selectable={turn.playing}
            newCard={newCardTag(view)}
            playable={turn.playable}
            onSelect={actions.select}
        />
    );
}

interface YourLookPromptProps {
    /** the time until play starts (GameScreen keeps it) */
    clock: LookClock;
    /** on a phone: a panel of its own, over the table */
    floating?: boolean;
}

/** While everyone looks over their hand: who starts, the countdown, and Ready. Only this re-renders as it counts down. */
export function YourLookPrompt({clock, floating = false}: YourLookPromptProps) {
    let {view, turn, actions} = useTable();
    let left = useLookLeft(clock, view.look);
    if (!turn.look) return null;
    return (
        <LookPrompt
            floating={floating}
            starter={turn.look.starter}
            left={left}
            total={turn.look.total}
            waitingFor={turn.look.waitingFor}
            onReady={actions.start}
        />
    );
}

/** Go down, which opens the go-down dialog. It glows gold once your hand has what the round needs (a hint). */
export function GoDownButton({className, ...props}: Omit<ComponentProps<typeof Button>, "variant" | "disabled" | "onClick" | "children">) {
    let {turn, actions} = useTable();
    return (
        <Button
            {...props}
            variant={turn.goDown.ready ? "default" : "secondary"}
            disabled={!turn.goDown.enabled}
            onClick={actions.openGoDown}
            className={cn("relative", turn.goDown.ready && "pulse-gold", className)}
        >
            Go down
        </Button>
    );
}
