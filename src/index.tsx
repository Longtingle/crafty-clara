import {createRoot} from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(<App />);

// The web's own extras. An app build has its files and its storage on the
// phone already, so it leaves these out.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
    // keeps the site on this device, to install it and play offline (vite.config.js)
    window.addEventListener("load", () => {
        navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch(() => {});
    });
}
// Once installed, it asks the browser to keep the saved game and your history
// even when space runs low. (A website asking can bring up a prompt.)
if (matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches) {
    navigator.storage?.persist?.().catch(() => {});
}
