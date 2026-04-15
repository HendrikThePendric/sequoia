import { positiveIntegerInput } from './positive-integer-input'

export type LevelDetails = {
    childrenLength: number
    percentageOfLeafNodes: number
}

export type DetailsPerLevel = Map<number, LevelDetails>

export function getLevelDetails(
    detailsPerLevel: DetailsPerLevel,
    level: number
): LevelDetails {
    const details = detailsPerLevel.get(level)
    if (!details) {
        throw new Error(`No level details found for level ${level}`)
    }
    return details
}

export async function levelsPrompts(): Promise<{
    numberOfLevels: number
    detailsPerLevel: DetailsPerLevel
}> {
    const numberOfLevels = await positiveIntegerInput(
        'Number of levels in the tree:',
        '3'
    )
    const detailsPerLevel: DetailsPerLevel = new Map()

    /* The last level, by definition, cannot have children,
     * so we stop iterating one level before last */
    for (let level = 1; level < numberOfLevels; level++) {
        const childrenLength = await positiveIntegerInput(
            `Average number of children per node at level ${level}:`,
            '50'
        )

        const percentageOfLeafNodes =
            level === 1
                ? 0 // No leaf nodes at root level
                : await positiveIntegerInput(
                      `Occurrence of leaf nodes at level ${level} (in %):`,
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
