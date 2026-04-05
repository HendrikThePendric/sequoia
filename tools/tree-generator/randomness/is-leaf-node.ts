export function isLeafNode(occurenceInPercent: number): boolean {
    if (occurenceInPercent === 0) {
        return false
    } else if (occurenceInPercent === 100) {
        return true
    } else {
        return occurenceInPercent / 100 > Math.random()
    }
}
