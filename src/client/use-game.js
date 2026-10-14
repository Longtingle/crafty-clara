import {useSyncExternalStore} from 'react';

// The game as your seat sees it, kept up to date: {view, refusal, send}.
// view is null until the host's first message arrives; refusal is the last
// command the host turned down ({command, error, seq}), if any.
export function useGame(client) {
    let {view, refusal} = useSyncExternalStore(client.subscribe, client.getSnapshot);
    return {view, refusal, send : client.send};
}
