// @vitest-environment node
import {memoryStore} from './store.ts';
import {createHeardLines} from './heard-lines.ts';

it('keeps the lines heard lately, newest last, each once', async () => {
    const heard = createHeardLines(memoryStore());
    expect(await heard.list()).toEqual([]);
    heard.add("alan.dealBad.0");
    heard.add("gemma.doubt.1");
    heard.add("alan.dealBad.0");
    expect(await heard.list()).toEqual(["gemma.doubt.1", "alan.dealBad.0"]);
});

it('keeps only the newest few hundred', async () => {
    const heard = createHeardLines(memoryStore());
    for (let i = 0; i < 320; i++) heard.add("line." + i);
    const kept = await heard.list();
    expect(kept).toHaveLength(300);
    expect(kept[0]).toBe("line.20");
    expect(kept.at(-1)).toBe("line.319");
});
