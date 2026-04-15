export function isLeafNode(occurrenceInPercent: number): boolean {
    if (occurrenceInPercent === 0) {
        return false
    } else if (occurrenceInPercent === 100) {
        return true
    } else {
        return occurrenceInPercent / 100 > Math.random()
    }
}
