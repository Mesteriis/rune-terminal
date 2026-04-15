export function logRuntimeValidation(data: Record<string, string>): void {
    console.group("RunaTerminal runtime validation");
    for (const [key, value] of Object.entries(data)) {
        console.log(`${key}=${value}`);
    }
    console.groupEnd();
}
