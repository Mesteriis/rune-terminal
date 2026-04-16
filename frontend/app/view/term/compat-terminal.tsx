import { terminalStore } from "@/app/state/terminal.store";
import { CenteredDiv } from "@/element/quickelems";
import { TermWrap } from "./termwrap";
import { useEffect, useRef } from "react";
import "./term.scss";
import "./xterm.css";

interface CompatTerminalViewProps {
    widgetId: string;
    connectionId?: string;
}

function isLocalConnection(connectionId?: string): boolean {
    return connectionId == null || connectionId === "" || connectionId === "local" || connectionId.startsWith("local:");
}

export function CompatTerminalView({ widgetId, connectionId }: CompatTerminalViewProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const connectElemRef = useRef<HTMLDivElement>(null);
    const termWrapRef = useRef<TermWrap | null>(null);

    useEffect(() => {
        if (connectElemRef.current == null) {
            return;
        }

        const termWrap = new TermWrap(
            widgetId,
            widgetId,
            connectElemRef.current,
            {
                fontSize: 12,
                fontFamily: "Hack",
                drawBoldTextInBrightColors: false,
                fontWeight: "normal",
                fontWeightBold: "bold",
                allowTransparency: true,
                scrollback: 2000,
                allowProposedApi: true,
                ignoreBracketedPasteMode: false,
            },
            {
                keydownHandler: () => true,
                useWebGl: false,
                sendDataHandler: (data: string) => {
                    void terminalStore.sendInput(widgetId, data).catch((err) => {
                        console.log("error sending terminal input", widgetId, err);
                    });
                },
            }
        );
        (
            termWrap as unknown as {
                isLocalConnection?: () => boolean;
            }
        ).isLocalConnection = () => isLocalConnection(connectionId);
        termWrapRef.current = termWrap;
        void termWrap.initTerminal();

        return () => {
            termWrap.dispose();
            termWrapRef.current = null;
        };
    }, [connectionId, widgetId]);

    if (!widgetId) {
        return <CenteredDiv>No Terminal Widget</CenteredDiv>;
    }

    return (
        <div
            ref={rootRef}
            className="view-term term-mode-term"
            onClick={() => {
                termWrapRef.current?.terminal.focus();
            }}
        >
            <div key="connectElem" className="term-connectelem" ref={connectElemRef} />
        </div>
    );
}
