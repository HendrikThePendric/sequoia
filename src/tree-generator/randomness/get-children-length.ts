export const MAX_DEVIATION = 0.5
// Math.random() includes 0 but not 1 and accepts max 17 decimals
const JUST_UNDER_HALF = 0.4999999999999999

export function getChildrenLength(approximateLength: number): number {
    const addOrSubtract = Math.random() > JUST_UNDER_HALF ? 1 : -1
    const deviation =
        Math.random() * MAX_DEVIATION * approximateLength * addOrSubtract

    return Math.round(approximateLength + deviation)
}
