// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { Block } from "@/app/block/block";
import { WorkspaceStoreSnapshot } from "@/app/state/workspace.store";
import { CenteredDiv } from "@/element/quickelems";
import { ContentRenderer, NodeModel, PreviewRenderer, TileLayout } from "@/layout/index";
import { TileLayoutContents } from "@/layout/lib/types";
import { atoms, getApi } from "@/store/global";
import * as services from "@/store/services";
import * as WOS from "@/store/wos";
import { atom, useAtomValue } from "jotai";
import * as React from "react";
import { useMemo } from "react";
import { CompatSplitLayout } from "./compat-split-layout";

const tileGapSizeAtom = atom((get) => {
    const settings = get(atoms.settingsAtom);
    return settings["window:tilegapsize"];
});

interface TabContentProps {
    tabId: string;
    compatWorkspace?: WorkspaceStoreSnapshot["active"];
}

const TabContent = React.memo(({ tabId, compatWorkspace }: TabContentProps) => {
    if (compatWorkspace != null) {
        return <CompatTabContent tabId={tabId} compatWorkspace={compatWorkspace} />;
    }
    return <LegacyTabContent tabId={tabId} />;
});

const CompatTabContent = React.memo(({ tabId, compatWorkspace }: TabContentProps) => {
    const compatTab = compatWorkspace?.tabs[tabId];
    const activeWidgetId = compatWorkspace?.activewidgetid ?? "";
    const widgets = compatWorkspace?.widgets ?? {};
    const innerContent =
        compatTab == null ? (
            <CenteredDiv>No Terminal Widget</CenteredDiv>
        ) : (
            <CompatSplitLayout tabId={tabId} tab={compatTab} widgets={widgets} activeWidgetId={activeWidgetId} />
        );

    return (
        <div className="flex flex-row flex-grow min-h-0 w-full items-center justify-center overflow-hidden relative pt-[3px] pr-[3px]">
            {innerContent}
        </div>
    );
});

const LegacyTabContent = React.memo(({ tabId }: { tabId: string }) => {
    const oref = useMemo(() => WOS.makeORef("tab", tabId), [tabId]);
    const loadingAtom = useMemo(() => WOS.getWaveObjectLoadingAtom(oref), [oref]);
    const tabLoading = useAtomValue(loadingAtom);
    const tabAtom = useMemo(() => WOS.getWaveObjectAtom<Tab>(oref), [oref]);
    const tabData = useAtomValue(tabAtom);
    const tileGapSize = useAtomValue(tileGapSizeAtom);

    const tileLayoutContents = useMemo(() => {
        const renderContent: ContentRenderer = (nodeModel: NodeModel) => {
            return <Block key={nodeModel.blockId} nodeModel={nodeModel} preview={false} />;
        };

        const renderPreview: PreviewRenderer = (nodeModel: NodeModel) => {
            return <Block key={nodeModel.blockId} nodeModel={nodeModel} preview={true} />;
        };

        function onNodeDelete(data: TabLayoutData) {
            return services.ObjectService.DeleteBlock(data.blockId);
        }

        return {
            renderContent,
            renderPreview,
            tabId,
            onNodeDelete,
            gapSizePx: tileGapSize,
        } as TileLayoutContents;
    }, [tabId, tileGapSize]);

    let innerContent;
    if (tabLoading) {
        innerContent = <CenteredDiv>Tab Loading</CenteredDiv>;
    } else if (!tabData) {
        innerContent = <CenteredDiv>Tab Not Found</CenteredDiv>;
    } else if (tabData?.blockids?.length == 0) {
        innerContent = null;
    } else {
        innerContent = (
            <TileLayout
                key={tabId}
                contents={tileLayoutContents}
                tabAtom={tabAtom}
                getCursorPoint={getApi().getCursorPoint}
            />
        );
    }

    return (
        <div className="flex flex-row flex-grow min-h-0 w-full items-center justify-center overflow-hidden relative pt-[3px] pr-[3px]">
            {innerContent}
        </div>
    );
});

export { TabContent };
