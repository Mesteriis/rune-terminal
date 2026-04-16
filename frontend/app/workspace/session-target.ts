export interface SessionTarget {
    targetSession: "local" | "remote";
    targetConnectionID: string;
}

export function isLocalConnectionID(connectionId: string | undefined): boolean {
    return (
        connectionId == null ||
        connectionId === "" ||
        connectionId === "local" ||
        connectionId.startsWith("local:")
    );
}

export function deriveSessionTarget(connectionId: string | undefined): SessionTarget {
    const normalizedConnectionID = connectionId?.trim() || "local";
    return {
        targetSession: isLocalConnectionID(normalizedConnectionID) ? "local" : "remote",
        targetConnectionID: normalizedConnectionID,
    };
}
