// Helper to capitalize the first letter of every word in a string
export function capitalizeFirstLetter(string: string) {
    return string
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

// Function to create a new Date object in a specific time zone
export function createNewDateInTimeZone(timeZone: string) {
    const options = {
        timeZone: timeZone
    };

    // Use the toLocaleString method to create a Date object in the specified time zone
    const dateInTimeZone = new Date().toLocaleString('en-US', options);
    // If you want to return a Date object, you can convert the string back to a Date
    return new Date(dateInTimeZone);
}
