import { positiveIntegerInput } from './positive-integer-input'

export async function rootNodesPrompt() {
    return await positiveIntegerInput('Number of root nodes:', '1')
}
