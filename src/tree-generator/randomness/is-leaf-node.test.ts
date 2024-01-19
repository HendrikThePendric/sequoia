import { describe, expect, it } from 'vitest'
import { isLeafNode } from './is-leaf-node'

describe('isLeafNode', () => {
    it('when repeated many times the outcomes conform with the provided occurance', () => {
        const OCCURENCE_IN_PERCENT = 20
        const REPEATS = 100
        let trueCount = 0
        let falseCount = 0
        for (let index = 0; index < REPEATS; index++) {
            if (isLeafNode(OCCURENCE_IN_PERCENT)) {
                trueCount++
            } else {
                falseCount++
            }
        }
        const observedOccurance = (trueCount / REPEATS) * 100
        expect(trueCount + falseCount).toBe(REPEATS)
        expect(observedOccurance).closeTo(OCCURENCE_IN_PERCENT, 10)
    })
})
