import { nanoid } from 'nanoid'
import type { Config } from 'unique-names-generator'
import {
    adjectives,
    animals,
    colors,
    uniqueNamesGenerator,
} from 'unique-names-generator'
import { DisplayNameType } from '../prompts/display-name-type-prompt'
import { IdType } from '../prompts/id-type-prompt'
import { TreeNode } from './generate-tree'

export type NodeDetailsGeneratorGenerator = (
    index: number,
    parentNode?: TreeNode
) => TreeNode

const randomNameConfig: Config = {
    dictionaries: [adjectives, colors, animals],
    separator: ' ',
    style: 'capital',
}

export const createNodeDetailsGenerator = (
    displayNameType: DisplayNameType,
    idType: IdType
): NodeDetailsGeneratorGenerator => {
    let integerId = 0

    return (index: number, parentNode?: TreeNode) => {
        const id = idType === 'uuid' ? nanoid(6) : (++integerId).toString()
        const path = parentNode?.path ? `${parentNode.path}/${id}` : `/${id}`
        const displayName =
            displayNameType === 'name'
                ? uniqueNamesGenerator(randomNameConfig)
                : displayNameType === 'occurrence'
                  ? parentNode?.displayName
                      ? `${parentNode.displayName}-${index + 1}`
                      : String(index + 1)
                  : path

        return {
            id,
            displayName,
            level: parentNode?.level ? parentNode.level + 1 : 1,
            path,
            parent: parentNode?.id ?? null,
        }
    }
}
