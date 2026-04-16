import { isLocalConnectionID } from "@/app/workspace/session-target";

export function pickPreferredRemoteConnectionID(
    activeConnectionID: string | undefined,
    remoteProfileConnectionIDs: string[],
): string | undefined {
    const normalizedActiveConnectionID = activeConnectionID?.trim();
    if (normalizedActiveConnectionID && !isLocalConnectionID(normalizedActiveConnectionID)) {
        return normalizedActiveConnectionID;
    }
    for (const connectionID of remoteProfileConnectionIDs) {
        const normalizedConnectionID = connectionID?.trim();
        if (normalizedConnectionID) {
            return normalizedConnectionID;
        }
    }
    return undefined;
}
