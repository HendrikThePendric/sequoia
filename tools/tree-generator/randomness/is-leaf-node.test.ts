import { describe, expect, it } from 'vitest'
import { isLeafNode } from './is-leaf-node'

describe('isLeafNode', () => {
    it('always returns false when occurrenceInPercent is 0', () => {
        for (let i = 0; i < 20; i++) {
            expect(isLeafNode(0)).toBe(false)
        }
    })

    it('always returns true when occurrenceInPercent is 100', () => {
        for (let i = 0; i < 20; i++) {
            expect(isLeafNode(100)).toBe(true)
        }
    })

    it('when repeated many times the outcomes conform with the provided occurrence', () => {
        const OCCURRENCE_IN_PERCENT = 20
        const REPEATS = 100
        let trueCount = 0
        let falseCount = 0
        for (let index = 0; index < REPEATS; index++) {
            if (isLeafNode(OCCURRENCE_IN_PERCENT)) {
                trueCount++
            } else {
                falseCount++
            }
        }
        const observedOccurrence = (trueCount / REPEATS) * 100
        expect(trueCount + falseCount).toBe(REPEATS)
        expect(observedOccurrence).closeTo(OCCURRENCE_IN_PERCENT, 10)
    })
})
