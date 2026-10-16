// @vitest-environment node
import {CAST} from './cast.ts';
import {LINES, type Moment, type Written} from './lines.ts';
import {lineEntry, lineText, linesFor, meaning} from './catalogue.ts';

describe('the catalogue of lines', () => {
    it('has every line, under an id made from who says it, when, and its words', () => {
        for (let {id : who} of CAST) {
            for (let [moment, lines] of Object.entries(LINES[who]) as [Moment, Written[]][]) {
                const entries = linesFor(who, moment);
                expect(entries.map(entry => entry.text)).toEqual(lines.map(written => (typeof written === "string") ? written : written.text));
                for (let entry of entries) {
                    expect(entry.id).toMatch(new RegExp("^" + who + "\\." + moment + "\\.[0-9a-z]+$"));
                    expect(lineEntry(entry.id)).toBe(entry);
                }
            }
        }
    });

    it('keeps the answers written for a line, which anyone may give', () => {
        const capitulating = linesFor("alan", "handBad").find(entry => entry.replies.length > 0)!;
        const reply = lineEntry(capitulating.replies[0])!;
        expect(reply).toMatchObject({character : null, text : "Well, if you do, you'll clean it up."});
        expect(reply.id.startsWith(capitulating.id + ".re.")).toBe(true);
    });

    it('says what a line asks for, and that an answer asks for nothing, but is as big as what it answers', () => {
        const blame = linesFor("clara", "dealBlame")[0];
        const out = linesFor("alan", "outOther")[0];
        const comeback = linesFor("clara", "comeback")[0];
        expect(meaning({id : blame.id, to : 3})).toMatchObject({big : false, invites : "dealer"});
        expect(meaning({id : out.id, to : 1})).toMatchObject({big : true, invites : "comeback"});
        expect(meaning({id : comeback.id, to : 2, re : out.id})).toEqual({big : true, invites : null, replies : []});
        expect(meaning({id : comeback.id, to : 2, re : blame.id}).big).toBe(false);
        // Chris's other lines ask for a groan
        expect(meaning({id : linesFor("chris", "reshuffle")[0].id}).invites).toBe("groan");
        expect(meaning({id : "nobody.said.this"})).toEqual({big : false, invites : null, replies : []});
    });

    it('fills in the name of whoever a line is said to, leaving out the name of whoever hears it', () => {
        const blame = linesFor("clara", "dealBlame").find(entry => entry.text.startsWith("{dealer}, "))!;
        const names = ["You", "Clara", "Alan", "Gemma"];
        const asHeardBy = (hearer: number) => lineText({id : blame.id, to : 3}, seat => (seat === hearer) ? null : names[seat]);
        expect(asHeardBy(0)).toBe(blame.text.replace("{dealer}", "Gemma"));
        expect(asHeardBy(3)).toMatch(/^[A-Z]/);
        expect(asHeardBy(3)).not.toMatch(/[{}]|Gemma/);
        // and a card it names
        const took = linesFor("clara", "tookDiscard").find(entry => entry.text.includes("{card}"));
        if (took) expect(lineText({id : took.id, card : "7♦"}, () => null)).toContain("7♦");
    });
});
