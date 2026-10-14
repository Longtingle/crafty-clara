// @vitest-environment node
import {seatPlaces} from './players.ts';

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
