import fs from 'node:fs'
import { generateTree } from './generators/generate-tree'
import {
    confirmTreeGeneratorParamsPrompt,
    filePathPrompts,
    showPromptHeader,
    showSuccessMessage,
    treeGeneratorParamsPrompts,
} from './prompts'

async function init() {
    try {
        showPromptHeader()
        const { filePath, dir } = await filePathPrompts()
        let confirmed, treeGeneratorParams

        while (!confirmed || !treeGeneratorParams) {
            treeGeneratorParams = await treeGeneratorParamsPrompts()
            confirmed =
                await confirmTreeGeneratorParamsPrompt(treeGeneratorParams)
        }
        const treeData = generateTree(treeGeneratorParams)

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(filePath, JSON.stringify(treeData, null, 4))
        showSuccessMessage(Object.keys(treeData).length, filePath)
    } catch (error) {
        const userInitiatedExit = error
            ?.toString()
            .includes('User force closed the prompt with 0 null')
        if (userInitiatedExit) {
            process.exit(0)
        } else {
            throw error
        }
    }
}

init()
