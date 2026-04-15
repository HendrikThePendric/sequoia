import { customAlphabet } from 'nanoid'
import type { Config } from 'unique-names-generator'
import {
    adjectives,
    animals,
    colors,
    uniqueNamesGenerator,
} from 'unique-names-generator'
import { DisplayNameType } from '../prompts/display-name-type-prompt'
import { IdType } from '../prompts/id-type-prompt'

const NANOID_ALPHABET =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const nanoid = customAlphabet(NANOID_ALPHABET, 6)

export type NodeDetails = {
    id: string
    displayName: string
}

export type NodeDetailsGenerator = (
    index: number,
    parentNode?: NodeDetails
) => NodeDetails

const randomNameConfig: Config = {
    dictionaries: [adjectives, colors, animals],
    separator: ' ',
    style: 'capital',
}

export const createNodeDetailsGenerator = (
    displayNameType: DisplayNameType,
    idType: IdType
): NodeDetailsGenerator => {
    let integerId = 0

    return (index: number, parentNode?: NodeDetails): NodeDetails => {
        const id = idType === 'nanoid' ? nanoid() : (++integerId).toString()
        const displayName =
            displayNameType === 'name'
                ? uniqueNamesGenerator(randomNameConfig)
                : parentNode?.displayName
                  ? `${parentNode.displayName}-${index + 1}`
                  : String(index + 1)

        return { id, displayName }
    }
}
