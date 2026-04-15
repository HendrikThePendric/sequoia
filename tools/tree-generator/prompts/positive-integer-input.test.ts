import { beforeEach, describe, expect, it, vi } from 'vitest'

let capturedValidate: (str: string) => string | boolean = () => true

vi.mock('@inquirer/prompts', () => ({
    input: vi.fn(
        ({ validate }: { validate: (str: string) => string | boolean }) => {
            capturedValidate = validate
            return Promise.resolve('1')
        }
    ),
}))

// Import after mock is set up
const { positiveIntegerInput } = await import('./positive-integer-input')

describe('positiveIntegerInput', () => {
    describe('validate', () => {
        beforeEach(async () => {
            await positiveIntegerInput('test', '1')
        })

        it('accepts a positive integer', () => {
            expect(capturedValidate('5')).toBe(true)
        })

        it('accepts 1 (minimum positive integer)', () => {
            expect(capturedValidate('1')).toBe(true)
        })

        it('rejects zero', () => {
            expect(capturedValidate('0')).toBe('Value not a positive integer')
        })

        it('rejects a negative integer', () => {
            expect(capturedValidate('-1')).toBe('Value not a positive integer')
        })

        it('rejects a float', () => {
            expect(capturedValidate('3.5')).toBe('Value not a positive integer')
        })

        it('rejects a non-numeric string', () => {
            expect(capturedValidate('abc')).toBe('Value not a positive integer')
        })

        it('rejects an empty string', () => {
            expect(capturedValidate('')).toBe('Value not a positive integer')
        })
    })

    describe('validate with max', () => {
        beforeEach(async () => {
            await positiveIntegerInput('test', '1', 99)
        })

        it('accepts a value at the max', () => {
            expect(capturedValidate('99')).toBe(true)
        })

        it('rejects a value exceeding max', () => {
            expect(capturedValidate('100')).toBe('Value exceeds 99')
        })
    })
})
