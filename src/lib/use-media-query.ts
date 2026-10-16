import {useSyncExternalStore} from 'react';

// How each query is watched, made once per query: React resubscribes
// whenever it's given a new subscribe function, which would otherwise be on
// every render, in every component that asks.
const watchers = new Map<string, (onChange: () => void) => () => void>();

const watcher = (query: string) => {
    let subscribe = watchers.get(query);
    if (!subscribe) {
        subscribe = (onChange) => {
            let list = window.matchMedia?.(query);
            list?.addEventListener("change", onChange);
            return () => list?.removeEventListener("change", onChange);
        };
        watchers.set(query, subscribe);
    }
    return subscribe;
};

// Whether a CSS media query matches, kept up to date as the window changes.
export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        watcher(query),
        () => window.matchMedia?.(query).matches ?? false,
        () => false
    );
}

/**
 * A short screen: a phone held sideways. It's the `short:` variant in
 * index.css, which must say the same.
 */
export const SHORT_SCREEN = "(max-height: 560px)";

// Whether the screen is short (SHORT_SCREEN).
export const useShortScreen = (): boolean => useMediaQuery(SHORT_SCREEN);
