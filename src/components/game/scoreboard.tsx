import {Crown} from 'lucide-react';
import {cn} from '@/lib/utils.ts';
import {Avatar, Chip} from './avatar.tsx';
import type {ScoreRow} from './scores.ts';
import SpeechBubble, {type Bubble} from './speech-bubble.tsx';

interface ScoreboardProps {
    rows: ScoreRow[];
    roundCount: number;
    /** a round (from 0) whose column to mark */
    highlightRound?: number;
    /** tighter, to fit beside the result on a phone */
    compact?: boolean;
    /** what each player is saying, by seat: shown beside their name, at the end of a round */
    speech?: Record<number, Bubble | null>;
}

// Ranked by total, lowest (best) first. What a player says pops up beside
// their name, over the scores, for a moment.
function Scoreboard({rows, roundCount, highlightRound, compact = false, speech = {}}: ScoreboardProps) {
    let ranked = [...rows].sort((a, b) => a.total - b.total);
    let best = ranked[0].total;
    let rounds = Array.from({length : roundCount}, (_, round) => round);

    return (
        <div className="overflow-x-auto">
            <table className={cn("w-full border-collapse tabular-nums", compact ? "text-[13px]" : "text-[15px]")}>
                <thead>
                    <tr className={cn("text-right text-muted-foreground", compact ? "text-[11.5px]" : "text-[13px]")}>
                        <th scope="col" className={cn("text-left", compact ? "w-7 px-1 py-1" : "w-10 px-2.5 py-2")}>#</th>
                        <th scope="col" className={cn("text-left", compact ? "px-1 py-1" : "px-2.5 py-2")}>Player</th>
                        {rounds.map(round => (
                            <th
                                key={round}
                                scope="col"
                                className={cn(compact ? "px-1 py-1" : "px-2.5 py-2", round === highlightRound && "rounded-t-lg bg-gold/10 text-gold")}
                            >
                                R{round + 1}
                            </th>
                        ))}
                        <th scope="col" className={compact ? "px-1.5 py-1" : "px-3.5 py-2"}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {ranked.map((row, position) => (
                        <tr key={row.key} className={cn("border-t border-white/10", row.isYou && "bg-cream/7")}>
                            <td className={compact ? "px-1 py-1.5" : "px-2.5 py-3"}>
                                {row.total === best
                                    ? <Crown className="size-4.5 text-gold" aria-label="Leader" />
                                    : <span className="text-muted-foreground">{position + 1}</span>}
                            </td>
                            <td className={compact ? "px-1 py-1.5" : "px-2.5 py-3"}>
                                <span className={cn("relative inline-flex items-center whitespace-nowrap", compact ? "gap-1.5" : "gap-2.5")}>
                                    <Avatar
                                        color={row.color}
                                        label={row.label}
                                        character={row.character}
                                        className={cn(compact ? "size-6 text-[11px]" : "size-7 text-[13px]", row.isYou && "text-[10px] text-cream-foreground", row.isYou && compact && "text-[9px]")}
                                    />
                                    <span className="font-bold">{row.name}</span>
                                    {row.wentOut && <Chip tone="gold">{compact ? "Out" : "Went out"}</Chip>}
                                    {!row.isYou && (
                                        <SpeechBubble
                                            bubble={speech[row.key]}
                                            name={row.name}
                                            from="left"
                                            className={cn(
                                                "top-1/2 left-full ml-2.5 -translate-y-1/2 whitespace-normal",
                                                compact ? "max-w-[240px] rounded-xl px-2.5 py-1 text-[12px] leading-tight" : "max-w-[360px] rounded-[14px] px-3 py-1.5 text-[14px] leading-snug"
                                            )}
                                        />
                                    )}
                                </span>
                            </td>
                            {rounds.map(round => (
                                <td
                                    key={round}
                                    className={cn(
                                        "text-right",
                                        compact ? "px-1 py-1.5" : "px-2.5 py-3",
                                        round === highlightRound && "bg-gold/10 font-bold",
                                        row.points[round] === undefined && "text-muted-foreground/50"
                                    )}
                                >
                                    {row.points[round] ?? "–"}
                                </td>
                            ))}
                            <td className={cn("text-right font-bold", compact ? "px-1.5 py-1.5 text-[15px]" : "px-3.5 py-3 text-lg", row.total === best && "text-gold")}>
                                {row.total}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default Scoreboard;
