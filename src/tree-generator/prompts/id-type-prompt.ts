import { select } from '@inquirer/prompts'

export type IdType = 'int' | 'uuid'

export async function idTypePrompt(): Promise<IdType> {
    return await select({
        message: 'Type of node ID:',
        choices: [
            {
                name: 'Integer',
                value: 'int',
            },
            {
                name: 'UUID',
                value: 'uuid',
            },
        ],
        default: 'int',
    })
}
