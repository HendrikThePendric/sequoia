import fs from 'node:fs'
import path from 'node:path'
import { confirm, input } from '@inquirer/prompts'

export async function filePathPrompts(): Promise<{
    filePath: string
    dir: string
}> {
    const projectRoot = process.env.PWD ?? ''
    const dir = await input({
        message: 'Destination folder:',
        default: 'tools/__fixtures__/tree-data',
    })
    const fileName = await input({
        message: 'File name (excl .json extension):',
        default: 'tree',
    })
    const file = `${fileName}.json`
    const filePath = path.resolve(projectRoot, dir, file)

    if (fs.existsSync(filePath)) {
        const shouldOverwrite = await confirm({
            message: `File already exists, overwrite it? (not recommended)`,
            default: false,
        })
        if (shouldOverwrite) {
            return { filePath, dir }
        } else {
            console.clear()
            return await filePathPrompts()
        }
    } else {
        return { filePath, dir }
    }
}
