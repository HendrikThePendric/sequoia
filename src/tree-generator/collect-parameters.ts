import {
    DisplayNameType,
    displayNameTypePrompt,
} from './prompts/display-name-type-prompt'
import { filePathPrompts } from './prompts/file-path-prompts'
import { IdType, idTypePrompt } from './prompts/id-type-prompt'
import { DetailsPerLevel, levelsPrompts } from './prompts/levels-prompts'
import { rootNodesPrompt } from './prompts/root-nodes-prompt'

export type TreeGeneratorParameters = {
    numberOfRootNodes: number
    numberOfLevels: number
    detailsPerLevel: DetailsPerLevel
    displayNameType: DisplayNameType
    idType: IdType
}

export async function collectParameters(): Promise<
    [string, TreeGeneratorParameters]
> {
    const filePath = await filePathPrompts()
    const numberOfRootNodes = await rootNodesPrompt()
    const { numberOfLevels, detailsPerLevel } = await levelsPrompts()
    const displayNameType = await displayNameTypePrompt()
    const idType = await idTypePrompt()

    return [
        filePath,
        {
            numberOfRootNodes,
            numberOfLevels,
            detailsPerLevel,
            displayNameType,
            idType,
        },
    ]
}
