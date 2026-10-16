// @vitest-environment node
import {seatNote, seatPlaces, seatQuestion} from './players.ts';

describe('seatPlaces', () => {
    it('puts you at the bottom left and the others round clockwise', () => {
        expect(seatPlaces(4)).toEqual({
            columns : 2,
            places : [{row : 1, column : 0}, {row : 0, column : 0}, {row : 0, column : 1}, {row : 1, column : 1}]
        });
    });

    it('stacks two players in one column', () => {
        expect(seatPlaces(2)).toEqual({columns : 1, places : [{row : 1, column : 0}, {row : 0, column : 0}]});
    });

    it('fills the top row before coming back along the bottom', () => {
        expect(seatPlaces(5).places).toEqual([
            {row : 1, column : 0}, {row : 0, column : 0}, {row : 0, column : 1}, {row : 0, column : 2}, {row : 1, column : 2}
        ]);
        expect(seatPlaces(6).places.at(-1)).toEqual({row : 1, column : 1});
    });
});

describe('seatNote and seatQuestion', () => {
    const notes = (names: string[]) => names.map((_, index) => [seatNote(index, names), seatQuestion(index, names)]);

    it('say what each seat means against three opponents, one of them opposite you', () => {
        expect(notes(["Clara", "Alan", "Gemma"])).toEqual([
            ["Plays straight after you, so gets your discards first", "Who plays straight after you?"],
            ["Plays opposite you", "Who plays opposite you?"],
            ["Plays just before you, so beats you to claims", "Who plays just before you?"]
        ]);
    });

    it('say who plays before a seat in the middle of a bigger table', () => {
        expect(notes(["Clara", "Alan", "Gemma", "Vena"]).slice(1, 3)).toEqual([
            ["Plays after Clara", "Who plays after Clara?"],
            ["Plays after Alan", "Who plays after Alan?"]
        ]);
    });

    it('say only before and after against two opponents', () => {
        expect(notes(["Clara", "Alan"]).map(([note]) => note)).toEqual([
            "Plays straight after you, so gets your discards first",
            "Plays just before you, so beats you to claims"
        ]);
    });
});
