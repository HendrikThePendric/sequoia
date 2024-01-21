import select from '@inquirer/select'
import { TreeGeneratorParameters } from '../generators/generate-tree'
import { LevelDetails } from './levels-prompts'

type ConfirmTreeGeneratorParamsPromptOptions = Omit<
    TreeGeneratorParameters,
    'displayNameType' | 'idType'
>

const MAX_SAFE_LENGTH = 1000000

export async function confirmTreeGeneratorParamsPrompt(
    options: ConfirmTreeGeneratorParamsPromptOptions
) {
    const estimatedNodeLength = computeEstimatedNodeLength(options)

    if (estimatedNodeLength > MAX_SAFE_LENGTH) {
        const formattedLength = new Intl.NumberFormat('en-US').format(
            estimatedNodeLength
        )
        const message = [
            'TOO MANY NODES WARNING:',
            `The current configuration will produce about ${formattedLength} nodes.`,
            'It is likely that this process is going to result in an out-of-memory exception.',
            'How do you want to proceed?',
        ].join('\n')
        const answer = await select({
            message,
            default: 'reconfigure',
            choices: [
                {
                    name: 'Reconfigure',
                    value: 'reconfigure',
                    description: 'Provide different tree generator parameters',
                },
                {
                    name: 'Proceed',
                    value: 'proceed',
                    description: 'Try to create the file (not recommended)',
                },
                {
                    name: 'Exit',
                    value: 'exit',
                    description: 'Abort the process',
                },
            ],
        })

        if (answer === 'exit') {
            process.exit(1)
        }

        return answer === 'proceed'
    } else {
        return Promise.resolve(true)
    }
}

export function computeEstimatedNodeLength({
    numberOfRootNodes,
    numberOfLevels,
    detailsPerLevel,
}: ConfirmTreeGeneratorParamsPromptOptions) {
    const { cummulativeCount: nodesCountPerRoot } = Array.from({
        length: numberOfLevels - 1,
    }).reduce<{ parentsCount: number; cummulativeCount: number }>(
        (acc, _, index) => {
            const { childrenLength, percentageOfLeafNodes } =
                detailsPerLevel.get(index + 1) as LevelDetails
            const leafNodesCount =
                childrenLength * (percentageOfLeafNodes / 100)
            const childrenCount =
                acc.parentsCount * (childrenLength - leafNodesCount)
            acc.parentsCount = childrenCount
            acc.cummulativeCount += childrenCount
            return acc
        },
        {
            parentsCount: 1,
            cummulativeCount: 1,
        }
    )
    return Math.round(nodesCountPerRoot * numberOfRootNodes)
}
