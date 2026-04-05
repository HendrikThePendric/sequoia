import { describe, expect, test, vi } from 'vitest'
import { DisplayNameType } from '../prompts/display-name-type-prompt'
import { IdType } from '../prompts/id-type-prompt'
import { createNodeDetailsGenerator } from './generate-node-details'

type UniqueNamesGeneratorMock = { uniqueNamesGenerator: () => string }
type TestCase = [DisplayNameType, IdType]

vi.mock('nanoid', () => ({
    nanoid: () => 'mockId',
}))

vi.mock('unique-names-generator', async (importOriginal) => {
    const original: UniqueNamesGeneratorMock = await importOriginal()
    return {
        ...original,
        uniqueNamesGenerator: () => 'A Mocked Name',
    }
})

const testCases: TestCase[] = [
    ['name', 'int'],
    ['occurrence', 'int'],
    ['path', 'int'],
    ['name', 'uuid'],
    ['occurrence', 'uuid'],
    ['path', 'uuid'],
]

describe('Node Details Generator', () => {
    test.each(testCases)(
        'Name type = %s \t ID type = %s',
        (nameType, idType) => {
            const generateNodeDetails = createNodeDetailsGenerator(
                nameType,
                idType
            )
            const root = generateNodeDetails(0)

            expect(root).toMatchSnapshot()
            expect(generateNodeDetails(1, root)).toMatchSnapshot()
        }
    )
})
