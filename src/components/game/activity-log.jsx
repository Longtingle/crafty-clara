import {motion} from 'motion/react';
import {actorName, actorColor} from './players.js';

const SHOWN = 5;

// The latest moves, newest first, so nothing the AI does goes unseen.
function ActivityLog({log, AIPlayers}) {
    return (
        <aside aria-label="Activity" className="w-[300px] max-w-full rounded-2xl bg-panel px-4 pt-3 pb-3.5">
            <div className="mb-2.5 flex items-baseline justify-between">
                <h2 className="text-[13px] font-bold tracking-widest text-muted-foreground uppercase">Activity</h2>
                <span className="text-xs text-muted-foreground">Newest first</span>
            </div>
            {log.length === 0
                ? <p className="text-sm text-muted-foreground">Nothing yet this round.</p>
                : (
                    <ol aria-live="polite" className="flex flex-col gap-2">
                        {log.slice(0, SHOWN).map(entry => (
                            <motion.li
                                key={entry.id}
                                layout="position"
                                initial={{opacity : 0, x : -12}}
                                animate={{opacity : 1, x : 0}}
                                transition={{duration : 0.25, ease : "easeOut"}}
                                className="flex items-start gap-2.5 text-sm leading-snug"
                            >
                                <span
                                    aria-hidden="true"
                                    className="mt-1 size-2.5 flex-none rounded-full ring-[1.5px] ring-white/50"
                                    style={{backgroundColor : actorColor(entry.actor)}}
                                />
                                <span><strong>{actorName(entry.actor, AIPlayers)}</strong> {entry.text}</span>
                            </motion.li>
                        ))}
                    </ol>
                )}
        </aside>
    );
}

export default ActivityLog;
