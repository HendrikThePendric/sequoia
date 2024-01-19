import {
    uniqueNamesGenerator,
    Config,
    adjectives,
    colors,
    animals,
} from 'unique-names-generator'
import { TreeNode } from './generate-tree'
import { DisplayNameType } from '../prompts/display-name-type-prompt'
import { IdType } from '../prompts/id-type-prompt'
import { v4 as createUuid } from 'uuid'

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
        const id = idType === 'uuid' ? createUuid() : (++integerId).toString()
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
