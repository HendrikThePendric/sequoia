import { input } from '@inquirer/prompts'

export async function positiveIntegerInput(
    message: string,
    defaultValue: string,
    max: number = Infinity
) {
    const resultStr = await input({
        message,
        default: defaultValue,
        validate: (str: string) => {
            const floatN = parseFloat(str)

            if (isNaN(floatN) || !Number.isInteger(floatN) || floatN <= 0) {
                return 'Value not a positive integer'
            } else if (floatN > max) {
                return `Value exceeds ${max}`
            } else {
                return true
            }
        },
    })
    return parseInt(resultStr)
}
