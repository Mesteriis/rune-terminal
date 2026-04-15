// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0s

import { getWebServerEndpoint } from "@/util/endpoints";
import { boundNumber, isBlank } from "@/util/util";
import { generate as generateCSS, parse as parseCSS, walk as walkCSS } from "css-tree";

function encodeFileURL(file: string): string {
    const webEndpoint = getWebServerEndpoint();
    const fileUri = formatRemoteUri(file, "local");
    const rtn = webEndpoint + `/wave/stream-file?path=${encodeURIComponent(fileUri)}&no404=1`;
    return rtn;
}

export function processBackgroundUrls(cssText: string): string | null {
    if (isBlank(cssText)) {
        return null;
    }
    cssText = cssText.trim();
    if (cssText.endsWith(";")) {
        cssText = cssText.slice(0, -1);
    }
    const attrRe = /^background(-image)?\s*:\s*/i;
    cssText = cssText.replace(attrRe, "");
    const ast = parseCSS("background: " + cssText, {
        context: "declaration",
    });
    let hasUnsafeUrl = false;
    walkCSS(ast, {
        visit: "Url",
        enter(node) {
            const originalUrl = node.value?.trim();
            if (originalUrl == null) {
                hasUnsafeUrl = true;
                return;
            }
            if (
                originalUrl.startsWith("http:") ||
                originalUrl.startsWith("https:") ||
                originalUrl.startsWith("data:")
            ) {
                return;
            }
            // allow file:/// urls (if they are absolute)
            if (originalUrl.startsWith("file://")) {
                const path = originalUrl.slice(7);
                if (!path.startsWith("/")) {
                    console.log(`Invalid background, contains a non-absolute file URL: ${originalUrl}`);
                    hasUnsafeUrl = true;
                    return;
                }
                const newUrl = encodeFileURL(path);
                node.value = newUrl;
                return;
            }
            // allow absolute paths
            if (originalUrl.startsWith("/") || originalUrl.startsWith("~/") || /^[a-zA-Z]:(\/|\\)/.test(originalUrl)) {
                const newUrl = encodeFileURL(originalUrl);
                node.value = newUrl;
                return;
            }
            hasUnsafeUrl = true;
            console.log(`Invalid background, contains an unsafe URL scheme: ${originalUrl}`);
        },
    });
    if (hasUnsafeUrl) {
        return null;
    }
    const rtnStyle = generateCSS(ast);
    if (rtnStyle == null) {
        return null;
    }
    return rtnStyle.replace(/^background:\s*/, "");
}

export function computeBgStyleFromMeta(
    meta: MetaType,
    defaultOpacity: number | null = null,
): React.CSSProperties | null {
    const bgAttr = meta?.["bg"];
    if (typeof bgAttr !== "string" || isBlank(bgAttr)) {
        return null;
    }
    const trimmedBg = bgAttr.trim();
    if (isBlank(trimmedBg)) {
        return null;
    }
    try {
        const processedBg = processBackgroundUrls(trimmedBg);
        const rtn: React.CSSProperties = {};
        if (processedBg == null) {
            return null;
        }
        rtn.background = processedBg;
        const rawBgOpacity = meta["bg:opacity"];
        const computedOpacity = typeof rawBgOpacity === "number" ? boundNumber(rawBgOpacity, 0, 1) : null;
        if (computedOpacity == null) {
            rtn.opacity = defaultOpacity == null ? undefined : defaultOpacity;
        } else {
            rtn.opacity = computedOpacity;
        }
        if (typeof meta["bg:blendmode"] === "string" && !isBlank(meta["bg:blendmode"])) {
            rtn.backgroundBlendMode = meta["bg:blendmode"];
        }
        return rtn;
    } catch (e) {
        console.error("error processing background", e);
        return null;
    }
}

export function formatRemoteUri(path: string, connection: string): string {
    const effectiveConnection = connection || "local";
    // TODO: We need a better way to handle s3 paths
    let retVal: string;
    if (effectiveConnection.startsWith("aws:")) {
        retVal = `${effectiveConnection}:s3://${path}`;
    } else {
        retVal = `wsh://${effectiveConnection}/${path}`;
    }
    return retVal;
}
