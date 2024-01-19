import { positiveIntegerInput } from './positive-integer-input'

export type LevelDetails = {
    childrenLength: number
    percentageOfLeafNodes: number
}

export type DetailsPerLevel = Map<number, LevelDetails>

export async function levelsPrompts(): Promise<{
    numberOfLevels: number
    detailsPerLevel: DetailsPerLevel
}> {
    const numberOfLevels = await positiveIntegerInput(
        'Number of levels in the tree:',
        '3'
    )
    const detailsPerLevel = new Map<
        number,
        { childrenLength: number; percentageOfLeafNodes: number }
    >()

    for (let level = 1; level <= numberOfLevels; level++) {
        const childrenLength = await positiveIntegerInput(
            `Average number of children per node at level ${level}:`,
            '50'
        )

        const percentageOfLeafNodes =
            level === numberOfLevels
                ? 100 // All nodes at last level are leaf nodes
                : level === 1
                  ? 0 // No leaf nodes at root level
                  : await positiveIntegerInput(
                        `Occurance of leaf nodes at level ${level} (in %):`,
                        '20',
                        99
                    )
        detailsPerLevel.set(level, {
            childrenLength,
            percentageOfLeafNodes,
        })
    }
    return {
        numberOfLevels,
        detailsPerLevel,
    }
}
