// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { PLATFORM, PlatformMacOS } from "@/util/platformutil";
import { computeBgStyleFromMeta } from "@/util/waveutil";
import useResizeObserver from "@react-hook/resize-observer";
import { useAtomValue } from "jotai";
import { type CSSProperties, useMemo, useLayoutEffect, useRef } from "react";
import { debounce } from "throttle-debounce";
import { atoms, getApi, WOS } from "./store/global";
import { useWaveObjectValue } from "./store/wos";

export function AppBackground({ compatMode = false }: { compatMode?: boolean }) {
    if (compatMode) {
        return <AppBackgroundCompat />;
    }
    return <AppBackgroundLegacy />;
}

function AppBackgroundLegacy() {
    const bgRef = useRef<HTMLDivElement>(null);
    const tabId = useAtomValue(atoms.staticTabId);
    const [tabData] = useWaveObjectValue<Tab>(WOS.makeORef("tab", tabId));
    const style: CSSProperties = computeBgStyleFromMeta(tabData?.meta, 0.5) ?? {};
    return <AppBackgroundBase bgRef={bgRef} style={style} />;
}

function AppBackgroundCompat() {
    const bgRef = useRef<HTMLDivElement>(null);
    return <AppBackgroundBase bgRef={bgRef} style={{}} />;
}

function AppBackgroundBase({ bgRef, style }: { bgRef: React.RefObject<HTMLDivElement>; style: CSSProperties }) {
    const debouncedGetAvgColor = useMemo(() => {
        return debounce(
            30,
            (entryTarget: HTMLElement) => {
                if (PLATFORM === PlatformMacOS || !("windowControlsOverlay" in window.navigator)) {
                    return;
                }
                const windowControlsOverlay = window.navigator.windowControlsOverlay as
                    | {
                          getTitlebarAreaRect(): Dimensions;
                      }
                    | undefined;
                if (windowControlsOverlay == null) {
                    return;
                }
                const titlebarRect = windowControlsOverlay.getTitlebarAreaRect();
                const bgRect = entryTarget.getBoundingClientRect();
                if (titlebarRect && bgRect) {
                    const windowControlsLeft = titlebarRect.width - titlebarRect.height;
                    const windowControlsRect: Dimensions = {
                        top: titlebarRect.top,
                        left: windowControlsLeft,
                        height: titlebarRect.height,
                        width: bgRect.width - bgRect.left - windowControlsLeft,
                    };
                    getApi().updateWindowControlsOverlay(windowControlsRect);
                }
            }
        );
    }, []);
    const handleBgResize = useMemo(
        () =>
            debounce(30, (entry: ResizeObserverEntry) => {
                if (!(entry.target instanceof HTMLElement)) {
                    return;
                }
                debouncedGetAvgColor(entry.target);
            }),
        [debouncedGetAvgColor]
    );

    useLayoutEffect(() => {
        if (bgRef.current == null) {
            return;
        }
        debouncedGetAvgColor(bgRef.current);
    }, [bgRef, debouncedGetAvgColor]);
    useResizeObserver(bgRef, handleBgResize);

    return <div ref={bgRef} className="pointer-events-none absolute top-0 left-0 w-full h-full z-[var(--zindex-app-background)]" style={style} />;
}
