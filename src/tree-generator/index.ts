import { generateTree } from './generators/generate-tree'
import {
    displayNameTypePrompt,
    filePathPrompts,
    idTypePrompt,
    levelsPrompts,
    rootNodesPrompt,
} from './prompts'
import { showPromptHeader } from './prompts/show-prompt-header'

async function init() {
    showPromptHeader()
    const filePath = await filePathPrompts()
    const numberOfRootNodes = await rootNodesPrompt()
    const { numberOfLevels, detailsPerLevel } = await levelsPrompts()
    const displayNameType = await displayNameTypePrompt()
    const idType = await idTypePrompt()
    const treeData = generateTree({
        numberOfRootNodes,
        numberOfLevels,
        detailsPerLevel,
        displayNameType,
        idType,
    })
    console.log(filePath, treeData)
}
init()
