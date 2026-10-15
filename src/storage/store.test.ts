import {browserStore, memoryStore} from './store.ts';

beforeEach(() => localStorage.clear());

describe.each([
    ['the browser store', () => browserStore()],
    ['the memory store', memoryStore]
])('%s', (_, create) => {
    it('keeps values by key, as JSON', async () => {
        const store = create();
        expect(await store.get("a")).toBeNull();
        await store.set("a", {round : 2, seats : [1, null, "x"]});
        expect(await store.get("a")).toEqual({round : 2, seats : [1, null, "x"]});
        await store.remove("a");
        expect(await store.get("a")).toBeNull();
    });
});

it('keeps values in localStorage', async () => {
    await browserStore().set("crafty-clara.levels", ["hard", "normal"]);
    expect(localStorage.getItem("crafty-clara.levels")).toBe('["hard","normal"]');
});

it('lets things go quietly where storage is blocked or holds nonsense', async () => {
    const blocked = {
        getItem : () => { throw new Error("blocked"); },
        setItem : () => { throw new Error("full"); },
        removeItem : () => { throw new Error("blocked"); }
    } as unknown as Storage;
    const store = browserStore(blocked);
    expect(await store.get("a")).toBeNull();
    await expect(store.set("a", 1)).resolves.toBeUndefined();
    await expect(store.remove("a")).resolves.toBeUndefined();

    localStorage.setItem("a", "{not json");
    expect(await browserStore().get("a")).toBeNull();
});
