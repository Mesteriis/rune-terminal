import { getSettingsKeyAtom, globalStore } from "@/store/global";
import * as keyutil from "@/util/keyutil";
import { isMacOS, isWindows } from "@/util/platformutil";
import type { TermWrap } from "./termwrap";

function shouldHandleCtrlVPaste(): boolean {
    // TideTerm does not use Ctrl+V for paste on macOS.
    if (isMacOS()) {
        return false;
    }

    const ctrlVPasteAtom = getSettingsKeyAtom("app:ctrlvpaste");
    const ctrlVPasteSetting = globalStore.get(ctrlVPasteAtom);
    if (ctrlVPasteSetting != null) {
        return ctrlVPasteSetting;
    }

    return isWindows();
}

export function handleCompatTerminalClipboardKeydown(event: KeyboardEvent, termWrap: TermWrap | null): boolean {
    const waveEvent = keyutil.adaptFromReactOrNativeKeyEvent(event);
    if (waveEvent.type !== "keydown") {
        return true;
    }

    if (keyutil.checkKeyPressed(waveEvent, "Escape") && termWrap?.isComposing) {
        termWrap.resetCompositionState();
    }

    if (shouldHandleCtrlVPaste() && keyutil.checkKeyPressed(waveEvent, "Ctrl:v")) {
        event.preventDefault();
        event.stopPropagation();
        void termWrap?.pasteHandler();
        return false;
    }

    if (keyutil.checkKeyPressed(waveEvent, "Ctrl:Shift:v")) {
        event.preventDefault();
        event.stopPropagation();
        void termWrap?.pasteHandler();
        return false;
    }

    if (keyutil.checkKeyPressed(waveEvent, "Ctrl:Shift:c")) {
        event.preventDefault();
        event.stopPropagation();
        const selection = termWrap?.terminal.getSelection();
        if (!selection) {
            return false;
        }
        void navigator.clipboard.writeText(selection);
        return false;
    }

    return true;
}
