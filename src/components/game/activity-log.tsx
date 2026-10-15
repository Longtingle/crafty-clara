import {motion} from 'motion/react';
import type {ActivityEntry} from './log-text.ts';

const SHOWN = 5;

// The latest moves, newest first, so nothing an opponent does goes unseen.
// entries come from activityEntries (log-text.ts). In a short window the
// oldest fade out at the bottom: the fade covers the list's bottom padding, so
// it only shows on entries that don't fit.
function ActivityLog({entries}: {entries: ActivityEntry[]}) {
    return (
        <aside aria-label="Activity" className="flex max-h-full w-[300px] max-w-full flex-col rounded-2xl bg-panel px-4 pt-3">
            <div className="mb-2.5 flex flex-none items-baseline justify-between">
                <h2 className="text-[13px] font-bold tracking-widest text-muted-foreground uppercase">Activity</h2>
                <span className="text-xs text-muted-foreground">Newest first</span>
            </div>
            {entries.length === 0
                ? <p className="pb-4 text-sm text-muted-foreground">Nothing yet this round.</p>
                : (
                    <ol
                        aria-live="polite"
                        className="flex min-h-0 flex-col gap-2 overflow-hidden pb-4 [mask-image:linear-gradient(to_bottom,black_calc(100%-16px),transparent)]"
                    >
                        {entries.slice(0, SHOWN).map(entry => (
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
                                    style={{backgroundColor : entry.color}}
                                />
                                <span><strong>{entry.name}</strong> {entry.text}</span>
                            </motion.li>
                        ))}
                    </ol>
                )}
        </aside>
    );
}

export default ActivityLog;
