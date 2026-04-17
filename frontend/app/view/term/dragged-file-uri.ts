export interface ParsedDraggedFileURI {
    connection: string | null;
    path: string;
}

export function parseDraggedFileUri(uri: string): ParsedDraggedFileURI | null {
    if (!uri) {
        return null;
    }
    if (uri.startsWith("wsh://")) {
        // Connection names may include user/host/port patterns, so avoid URL parsing here.
        const rest = uri.slice("wsh://".length);
        const slashIndex = rest.indexOf("/");
        if (slashIndex === -1) {
            return { connection: rest || null, path: "" };
        }
        const connection = rest.slice(0, slashIndex);
        let path = decodeURIComponent(rest.slice(slashIndex));
        if (path.startsWith("//")) {
            path = path.slice(1);
        }
        return { connection: connection || null, path };
    }
    const s3Marker = ":s3://";
    const s3Index = uri.indexOf(s3Marker);
    if (s3Index > 0) {
        return {
            connection: uri.slice(0, s3Index),
            path: uri.slice(s3Index + 1),
        };
    }
    return { connection: null, path: uri };
}
