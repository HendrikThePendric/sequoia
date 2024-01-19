import * as uniqueNamesGeneratorExports from 'unique-names-generator'
import * as uuidExports from 'uuid'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { DisplayNameType } from '../prompts/display-name-type-prompt'
import { IdType } from '../prompts/id-type-prompt'
import { createNodeDetailsGenerator } from './generate-node-details'

type UuidMock = { v4: () => string }
type UniqueNamesGeneratorMock = { uniqueNamesGenerator: () => string }
type TestCase = [DisplayNameType, IdType]

const testCases: TestCase[] = [
    ['name', 'int'],
    ['occurrence', 'int'],
    ['path', 'int'],
    ['name', 'uuid'],
    ['occurrence', 'uuid'],
    ['path', 'uuid'],
]

describe('Node Details Generator', () => {
    beforeAll(() => {
        vi.spyOn(uuidExports, 'v4').mockReturnValue('mock-uuid-value')
        vi.spyOn(uniqueNamesGeneratorExports, 'uniqueNamesGenerator')
        vi.mock('uuid', async (importOriginal) => {
            const original: UuidMock = await importOriginal()
            return {
                ...original,
                v4: () => 'mock-uuid-value',
            }
        })
        vi.mock('unique-names-generator', async (importOriginal) => {
            const original: UniqueNamesGeneratorMock = await importOriginal()
            return {
                ...original,
                uniqueNamesGenerator: () => 'A Mocked Name',
            }
        })
    })
    afterAll(() => {
        vi.restoreAllMocks()
    })
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
