import fs from 'node:fs'
import { Tree, generateTree } from './generators/generate-tree'
import {
    confirmTreeGeneratorParamsPrompt,
    filePathPrompts,
    showPromptHeader,
    showSuccessMessage,
    treeGeneratorParamsPrompts,
} from './prompts'

function countNodes(tree: Tree): number {
    let count = 0
    function walk(nodes: Tree): void {
        for (const node of nodes) {
            count++
            walk(node.children)
        }
    }
    walk(tree)
    return count
}

async function init(): Promise<void> {
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
        showSuccessMessage(countNodes(treeData), filePath)
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
