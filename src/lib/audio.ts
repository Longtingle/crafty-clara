// Sound effects, through the Web Audio API, so they start at once and can
// overlap. A browser only lets a page make sound after a tap or a click, so
// unlockAudio is called from one (dealing, or carrying on a game). Until
// then, playing does nothing. A phone that suspends the sound (say, after
// you've been in another app) gets it back at your next tap.

const FOLDER = import.meta.env.BASE_URL + "audio/";

let context: AudioContext | null = null;
let buffers = new Map<string, Promise<AudioBuffer | null>>();

const load = (name: string): Promise<AudioBuffer | null> => {
    let buffer = buffers.get(name);
    if (!buffer) {
        buffer = fetch(FOLDER + name + ".mp3")
            .then(response => response.arrayBuffer())
            .then(data => context!.decodeAudioData(data))
            .catch(() => null);
        buffers.set(name, buffer);
    }
    return buffer;
};

const resume = (): void => {
    if (context?.state === "suspended") void context.resume().catch(() => {});
};

/** Lets the page make sound, and starts loading these. Call it from a tap or a click. */
export const unlockAudio = (names: string[]): void => {
    if (typeof AudioContext === "undefined") return;
    if (!context) {
        context = new AudioContext();
        document.addEventListener("pointerdown", resume);
    }
    resume();
    names.forEach(load);
};

/** Plays a sound, at a volume from 0 to 1, after a delay (ms). */
export const playSound = (name: string, volume = 1, delay = 0): void => {
    if (context?.state !== "running") return;
    void load(name).then(buffer => {
        if (!buffer || !context) return;
        let source = context.createBufferSource();
        source.buffer = buffer;
        let gain = context.createGain();
        gain.gain.value = volume;
        source.connect(gain).connect(context.destination);
        source.start(context.currentTime + delay / 1000);
    });
};
