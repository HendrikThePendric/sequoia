export function showSuccessMessage(nodesLength: number, filePath: string) {
    console.log(
        [
            `🌲 Saved tree with ${nodesLength} nodes to JSON file:`,
            `🌲 ${filePath}`,
        ].join('\n')
    )
}
