// Phones and tablets play best full screen, without the browser's bars, which
// take a third of the height of a phone held sideways. Browsers only allow
// full screen in answer to a tap, so the game asks for it when you start a
// game. iPhones don't allow it for web pages at all; there, adding the game to
// the home screen opens it full screen instead (public/manifest.webmanifest).

// A touch screen, where full screen is worth having (not a desktop browser)
const isTouchScreen = (): boolean => window.matchMedia?.("(pointer: coarse)").matches ?? false;

/** Whether the game can go full screen now, and would want to. */
export const canGoFullscreen = (): boolean =>
    isTouchScreen() && Boolean(document.fullscreenEnabled) && !document.fullscreenElement;

/** Goes full screen and holds the screen sideways, where it can. Call it from a tap. */
export const goFullscreen = async (): Promise<void> => {
    if (!canGoFullscreen()) return;
    try {
        await document.documentElement.requestFullscreen({navigationUI : "hide"});
        // only some browsers can lock the orientation, and only once full screen
        let orientation = screen.orientation as ScreenOrientation & {lock?: (orientation: string) => Promise<void>};
        await orientation.lock?.("landscape");
    } catch {
        // not allowed here: play on in the browser
    }
};
