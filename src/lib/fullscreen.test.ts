import {canGoFullscreen, goFullscreen} from './fullscreen.ts';

// jsdom has no full screen and no media queries, so each test fakes what a browser would have.
const fake = ({touch, enabled}: {touch: boolean; enabled: boolean}) => {
    const requestFullscreen = vi.fn(() => Promise.resolve());
    vi.stubGlobal("matchMedia", (query: string) => ({matches : touch && query === "(pointer: coarse)"}));
    Object.defineProperty(document, "fullscreenEnabled", {value : enabled, configurable : true});
    document.documentElement.requestFullscreen = requestFullscreen;
    return requestFullscreen;
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('goFullscreen', () => {
    it('goes full screen on a touch screen that allows it', async () => {
        const request = fake({touch : true, enabled : true});
        expect(canGoFullscreen()).toBe(true);
        await goFullscreen();
        expect(request).toHaveBeenCalledWith({navigationUI : "hide"});
    });

    it('leaves a desktop browser alone, and a phone that does not allow it (an iPhone)', async () => {
        for (const setting of [{touch : false, enabled : true}, {touch : true, enabled : false}]) {
            const request = fake(setting);
            await goFullscreen();
            expect(request).not.toHaveBeenCalled();
        }
    });

    it('plays on in the browser when full screen is refused', async () => {
        const request = fake({touch : true, enabled : true});
        request.mockImplementation(() => Promise.reject(new Error("not allowed")));
        await expect(goFullscreen()).resolves.toBeUndefined();
    });
});
