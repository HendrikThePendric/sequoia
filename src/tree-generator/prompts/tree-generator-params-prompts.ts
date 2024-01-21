import { TreeGeneratorParameters } from '../generators/generate-tree'
import { displayNameTypePrompt } from './display-name-type-prompt'
import { idTypePrompt } from './id-type-prompt'
import { levelsPrompts } from './levels-prompts'
import { rootNodesPrompt } from './root-nodes-prompt'

export async function treeGeneratorParamsPrompts(): Promise<TreeGeneratorParameters> {
    const numberOfRootNodes = await rootNodesPrompt()
    const { numberOfLevels, detailsPerLevel } = await levelsPrompts()
    const displayNameType = await displayNameTypePrompt()
    const idType = await idTypePrompt()

    return {
        numberOfRootNodes,
        numberOfLevels,
        detailsPerLevel,
        displayNameType,
        idType,
    }
}
