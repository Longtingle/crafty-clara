// jest-dom adds custom matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver, which Radix uses to place popovers. Nothing
// is ever resized in a test, so one that never reports is enough.
if (typeof window !== "undefined" && window.ResizeObserver === undefined) {
    window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}
