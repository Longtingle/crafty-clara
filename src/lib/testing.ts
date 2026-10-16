// Test helpers for the UI.

import {SHORT_SCREEN} from './use-media-query.ts';

/**
 * Makes the screen short, a phone held sideways, until the function it
 * returns is called: jsdom has no matchMedia of its own, so without this
 * every test sees the wide layout.
 */
export const pretendShortScreen = (): (() => void) => {
    let original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
        matches : query === SHORT_SCREEN,
        media : query,
        onchange : null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent : () => false
    })) as unknown as typeof window.matchMedia;
    return () => {
        window.matchMedia = original;
    };
};
