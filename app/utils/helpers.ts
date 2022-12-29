// Helper to capitalize the first letter of every word in a string
export function capitalizeFirstLetter(string: string) {
    return string
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}