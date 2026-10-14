// @vitest-environment node
import {archPlace, MAX_DROP, MAX_TILT} from './arch.ts';

const arch = (count: number) => Array.from({length : count}, (_, index) => archPlace(index, count));

describe('archPlace', () => {
    it('keeps a single card upright', () => {
        expect(archPlace(0, 1)).toEqual({angle : 0, drop : 0});
    });

    it('leans the cards out from the middle, and drops them towards the ends', () => {
        let places = arch(7);
        expect(places[3]).toEqual({angle : 0, drop : 0});
        expect(places[0].angle).toBeLessThan(places[1].angle);
        expect(places[6].angle).toBeGreaterThan(places[5].angle);
        expect(places[0].drop).toBeGreaterThan(places[1].drop);
        // the same on both sides
        expect(places[0]).toEqual({angle : -places[6].angle, drop : places[6].drop});
    });

    it('caps the lean and the drop however many cards there are', () => {
        for (let count of [2, 5, 13, 20]) {
            for (let place of arch(count)) {
                expect(Math.abs(place.angle)).toBeLessThanOrEqual(MAX_TILT);
                expect(place.drop).toBeLessThanOrEqual(MAX_DROP);
            }
        }
        expect(arch(13)[0]).toEqual({angle : -MAX_TILT, drop : MAX_DROP});
    });

    it('curves a short hand more gently than a long one', () => {
        expect(Math.abs(arch(3)[0].angle)).toBeLessThan(Math.abs(arch(13)[0].angle));
    });
});
