import { describe, expect, it } from 'vitest'
import { MAX_DEVIATION, getChildrenLength } from './get-children-length'

describe('getChildrenLength', () => {
    const APPROXIMATE_LENGTH = 60
    const results = Array.from({ length: 100 }).map(() =>
        getChildrenLength(APPROXIMATE_LENGTH)
    )
    it('produces varying results', () => {
        const deduplicatedResults = new Set(results)
        expect(deduplicatedResults.size).toBeGreaterThan(1)
    })
    it('includes results lower and higher than the provided length', () => {
        expect(results.some((result) => result > APPROXIMATE_LENGTH)).toBe(true)
        expect(results.some((result) => result < APPROXIMATE_LENGTH)).toBe(true)
    })
    it(`variation remains within the max deviation (${MAX_DEVIATION})`, () => {
        const deviationOnLength = APPROXIMATE_LENGTH * MAX_DEVIATION
        const min = APPROXIMATE_LENGTH - deviationOnLength
        const max = APPROXIMATE_LENGTH + deviationOnLength

        expect(results.every((result) => result >= min)).toBe(true)
        expect(results.every((result) => result <= max)).toBe(true)
    })
})
