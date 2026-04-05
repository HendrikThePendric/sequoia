import { select } from '@inquirer/prompts'

export type DisplayNameType = 'name' | 'occurrence' | 'path'

export async function displayNameTypePrompt(): Promise<DisplayNameType> {
    return await select({
        message: 'Naming scheme for node display names:',
        choices: [
            {
                name: 'Random names',
                value: 'name',
                description: 'suitable for demos',
            },
            {
                name: 'Occurrence based names (1-1-1)',
                value: 'occurrence',
                description: 'good for inspecting general nesting structure',
            },
            {
                name: 'Path based names (id1/id2/id3)',
                value: 'path',
                description: 'perfect for inspecting specific hierarchies',
            },
        ],
        default: 'occurrence',
    })
}
