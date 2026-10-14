import {Check, CircleAlert} from 'lucide-react';
import {cn} from '@/lib/utils.ts';
import type {TurnStep} from './your-turn.ts';

interface TurnPromptProps {
    /** null when it's not your turn */
    steps: TurnStep[] | null;
    text: string;
    /** why a move didn't work, shown in place of text */
    notice: string | null;
}

function TurnPrompt({steps, text, notice}: TurnPromptProps) {
    return (
        <div
            role="status"
            aria-live="polite"
            className="flex min-h-17 max-w-[720px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-black/30 px-5 py-2.5 text-center compact:min-h-0 compact:py-2 short:px-3 short:py-1"
        >
            {steps && (
                <ol aria-label="Turn steps" className="flex items-center gap-2.5 text-[13px] compact:hidden">
                    {steps.map((step, index) => (
                        <li key={step.label} className="flex items-center gap-2.5">
                            {index > 0 && <span aria-hidden="true" className="h-px w-4.5 bg-white/30" />}
                            <span className={cn(
                                "inline-flex items-center gap-1.5",
                                step.state === "current" ? "font-bold text-gold" : "text-muted-foreground"
                            )}>
                                {step.state === "done" && <Check className="size-3.5" strokeWidth={3} aria-label="done:" />}
                                {step.state === "current" && <span aria-hidden="true" className="size-2 rounded-full bg-gold" />}
                                {step.state === "todo" && <span aria-hidden="true" className="size-2 rounded-full border-[1.5px] border-current" />}
                                {step.label}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
            {notice
                ? (
                    <p className="flex items-center gap-2 leading-snug text-warn short:text-sm">
                        <CircleAlert className="size-4.5 flex-none" aria-hidden="true" />
                        {notice}
                    </p>
                )
                : <p className="leading-snug short:text-sm">{text}</p>}
        </div>
    );
}

export default TurnPrompt;
