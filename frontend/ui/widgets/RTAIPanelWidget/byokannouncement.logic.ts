// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcApi } from "@/app/store/wshclientapi";
import { TabRpcClient } from "@/app/store/wshrpcutil";

export type BYOKAnnouncementProps = Record<string, never>;

type OpenWaveAIConfig = () => Promise<void>;

function recordBYOKAction(actionType: string): void {
    RpcApi.RecordTEventCommand(
        TabRpcClient,
        {
            event: "action:other",
            props: {
                "action:type": actionType,
            },
        },
        { noresponse: true }
    );
}

export async function handleBYOKOpenConfig(openWaveAIConfig: OpenWaveAIConfig): Promise<void> {
    recordBYOKAction("waveai:configuremodes:panel");
    await openWaveAIConfig();
}

export function handleBYOKViewDocs(): void {
    recordBYOKAction("waveai:viewdocs:panel");
}

export function getBYOKAnnouncementContainerClassName(): string {
    return "bg-blue-900/20 border border-blue-800 rounded-lg p-4 mt-4";
}

export function getBYOKAnnouncementTitleClassName(): string {
    return "text-blue-400 font-medium mb-1";
}

export function getBYOKAnnouncementBodyClassName(): string {
    return "text-secondary text-sm mb-3";
}

export function getBYOKConfigureButtonClassName(): string {
    return "border border-blue-400 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors";
}

export function getBYOKDocsLinkClassName(): string {
    return "text-blue-400! hover:text-blue-300! hover:underline text-sm cursor-pointer transition-colors flex items-center gap-1";
}

