import {Crown} from 'lucide-react';
import {cn} from '@/lib/utils.ts';
import {Avatar, Chip} from './opponent-panel.tsx';
import type {ScoreRow} from './scores.ts';

interface ScoreboardProps {
    rows: ScoreRow[];
    roundCount: number;
    /** a round (from 0) whose column to mark */
    highlightRound?: number;
}

// Ranked by total, lowest (best) first.
function Scoreboard({rows, roundCount, highlightRound}: ScoreboardProps) {
    let ranked = [...rows].sort((a, b) => a.total - b.total);
    let best = ranked[0].total;
    let rounds = Array.from({length : roundCount}, (_, round) => round);

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[15px] tabular-nums">
                <thead>
                    <tr className="text-right text-[13px] text-muted-foreground">
                        <th scope="col" className="w-10 px-2.5 py-2 text-left">#</th>
                        <th scope="col" className="px-2.5 py-2 text-left">Player</th>
                        {rounds.map(round => (
                            <th
                                key={round}
                                scope="col"
                                className={cn("px-2.5 py-2", round === highlightRound && "rounded-t-lg bg-gold/10 text-gold")}
                            >
                                R{round + 1}
                            </th>
                        ))}
                        <th scope="col" className="px-3.5 py-2">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {ranked.map((row, position) => (
                        <tr key={row.key} className={cn("border-t border-white/10", row.isYou && "bg-cream/7")}>
                            <td className="px-2.5 py-3">
                                {row.total === best
                                    ? <Crown className="size-4.5 text-gold" aria-label="Leader" />
                                    : <span className="text-muted-foreground">{position + 1}</span>}
                            </td>
                            <td className="px-2.5 py-3">
                                <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
                                    <Avatar
                                        color={row.color}
                                        label={row.label}
                                        className={cn("size-7 text-[13px] short:size-7", row.isYou && "text-[10px] text-[#12402a]")}
                                    />
                                    <span className="font-bold">{row.name}</span>
                                    {row.wentOut && <Chip gold>Went out</Chip>}
                                </span>
                            </td>
                            {rounds.map(round => (
                                <td
                                    key={round}
                                    className={cn(
                                        "px-2.5 py-3 text-right",
                                        round === highlightRound && "bg-gold/10 font-bold",
                                        row.points[round] === undefined && "text-muted-foreground/50"
                                    )}
                                >
                                    {row.points[round] ?? "–"}
                                </td>
                            ))}
                            <td className={cn("px-3.5 py-3 text-right text-lg font-bold", row.total === best && "text-gold")}>
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
