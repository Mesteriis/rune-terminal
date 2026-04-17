// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import {
    ExpandableMenu,
    ExpandableMenuItem,
    ExpandableMenuItemGroup,
    ExpandableMenuItemGroupTitle,
    ExpandableMenuItemLeftElement,
    ExpandableMenuItemRightElement,
} from "@/element/expandablemenu";
import { Popover, PopoverButton, PopoverContent } from "@/element/popover";
import { fireAndForget, makeIconClass } from "@/util/util";
import clsx from "clsx";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { forwardRef, useCallback, useEffect, useState } from "react";
import workspaceSvgUrl from "../asset/workspace.svg?url";
import { IconButton } from "../element/iconbutton";
import { workspaceStore, type WorkspaceListEntry } from "../state/workspace.store";
import { WorkspaceEditor } from "./workspaceeditor";
import "./workspaceswitcher.scss";

type WorkspaceSwitcherEntry = WorkspaceListEntry;

interface WorkspaceSwitcherItemProps {
    entry: WorkspaceSwitcherEntry;
    activeWorkspaceId: string;
    editingWorkspaceId: string | null;
    workspaceThemes: { colors: string[]; icons: string[] };
    onDeleteWorkspace: (workspaceId: string) => void;
    onSetEditingWorkspace: (workspaceId: string | null) => void;
}

const WorkspaceSwitcherItem = ({
    entry,
    activeWorkspaceId,
    editingWorkspaceId,
    workspaceThemes,
    onDeleteWorkspace,
    onSetEditingWorkspace,
}: WorkspaceSwitcherItemProps) => {
    const workspace = entry.workspace;
    const isCurrentWorkspace = activeWorkspaceId === workspace.oid;
    const isActive = !!entry.windowId;
    const isEditing = editingWorkspaceId === workspace.oid;

    const startEdit = (event: React.MouseEvent) => {
        event.stopPropagation();
        onSetEditingWorkspace(editingWorkspaceId === workspace.oid ? null : workspace.oid);
    };

    const handleSwitch = () => {
        fireAndForget(() => workspaceStore.switchWorkspace(workspace.oid));
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    };

    const editIconDecl: IconButtonDecl = {
        elemtype: "iconbutton",
        className: "edit",
        icon: "pencil",
        title: "Edit workspace",
        click: startEdit,
    };

    const windowIconDecl: IconButtonDecl = {
        elemtype: "iconbutton",
        className: "window",
        noAction: true,
        icon: isCurrentWorkspace ? "check" : "window",
        title: isCurrentWorkspace ? "This is your current workspace" : "This workspace is open",
    };

    return (
        <ExpandableMenuItemGroup
            key={workspace.oid}
            isOpen={isEditing}
            className={clsx({ "is-current": isCurrentWorkspace })}
        >
            <ExpandableMenuItemGroupTitle onClick={handleSwitch}>
                <div className="menu-group-title-wrapper" style={{ "--workspace-color": workspace.color } as React.CSSProperties}>
                    <ExpandableMenuItemLeftElement>
                        <i className={clsx("left-icon", makeIconClass(workspace.icon, true))} style={{ color: workspace.color }} />
                    </ExpandableMenuItemLeftElement>
                    <div className="label">{workspace.name}</div>
                    <ExpandableMenuItemRightElement>
                        <div className="icons">
                            <IconButton decl={editIconDecl} />
                            {isActive && <IconButton decl={windowIconDecl} />}
                        </div>
                    </ExpandableMenuItemRightElement>
                </div>
            </ExpandableMenuItemGroupTitle>
            <ExpandableMenuItem>
                <WorkspaceEditor
                    title={workspace.name}
                    icon={workspace.icon}
                    color={workspace.color}
                    colors={workspaceThemes.colors}
                    icons={workspaceThemes.icons}
                    focusInput={isEditing}
                    onTitleChange={(title) => fireAndForget(() => workspaceStore.updateWorkspace(workspace.oid, title, workspace.icon, workspace.color, false))}
                    onColorChange={(color) =>
                        fireAndForget(() => workspaceStore.updateWorkspace(workspace.oid, workspace.name, workspace.icon, color, false))
                    }
                    onIconChange={(icon) =>
                        fireAndForget(() => workspaceStore.updateWorkspace(workspace.oid, workspace.name, icon, workspace.color, false))
                    }
                    onDeleteWorkspace={() => onDeleteWorkspace(workspace.oid)}
                />
            </ExpandableMenuItem>
        </ExpandableMenuItemGroup>
    );
};

const WorkspaceSwitcher = forwardRef<HTMLDivElement, { compatMode?: boolean }>(({ compatMode = false }, ref) => {
    const [workspaceState, setWorkspaceState] = useState(workspaceStore.getSnapshot());
    const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);

    useEffect(() => {
        fireAndForget(() => workspaceStore.refreshWorkspaceList());
        fireAndForget(() => workspaceStore.refreshThemes());
        if (!compatMode) {
            fireAndForget(() => workspaceStore.refresh());
        }
        const unsubscribe = workspaceStore.subscribe((snapshot) => {
            setWorkspaceState(snapshot);
        });
        return () => {
            unsubscribe();
        };
    }, [compatMode]);

    const onDeleteWorkspace = useCallback((workspaceId: string) => {
        fireAndForget(() => workspaceStore.deleteWorkspace(workspaceId));
        if (editingWorkspaceId === workspaceId) {
            setEditingWorkspaceId(null);
        }
    }, [editingWorkspaceId]);

    const saveWorkspace = useCallback(() => {
        fireAndForget(() => workspaceStore.updateWorkspace(workspaceState.active.oid, "", "", "", true));
        setEditingWorkspaceId(workspaceState.active.oid);
    }, [workspaceState.active.oid]);

    const refreshSwitcher = useCallback(() => {
        fireAndForget(() => workspaceStore.refreshWorkspaceList());
    }, []);

    const createWorkspace = useCallback(() => {
        fireAndForget(() => workspaceStore.createWorkspace());
    }, []);

    const isActiveWorkspaceSaved = !!(workspaceState.active.name && workspaceState.active.icon);

    const workspaceIcon = isActiveWorkspaceSaved ? (
        <i className={makeIconClass(workspaceState.active.icon, false)} style={{ color: workspaceState.active.color }} />
    ) : (
        <img src={workspaceSvgUrl} alt="" />
    );

    return (
        <Popover className="workspace-switcher-popover" placement="bottom-start" onDismiss={() => setEditingWorkspaceId(null)} ref={ref}>
            <PopoverButton
                className="workspace-switcher-button grey"
                as="div"
                onClick={refreshSwitcher}
                data-testid="workspace-switcher-button"
            >
                <span className="workspace-icon">{workspaceIcon}</span>
            </PopoverButton>
            <PopoverContent className="workspace-switcher-content" data-testid="workspace-switcher-surface">
                <div className="title">{isActiveWorkspaceSaved ? "Switch workspace" : "Open workspace"}</div>
                <OverlayScrollbarsComponent className="scrollable" options={{ scrollbars: { autoHide: "leave" } }}>
                    <ExpandableMenu noIndent singleOpen>
                        {workspaceState.list.map((entry) => (
                            <WorkspaceSwitcherItem
                                key={entry.workspace.oid}
                                entry={entry}
                                activeWorkspaceId={workspaceState.active.oid}
                                editingWorkspaceId={editingWorkspaceId}
                                workspaceThemes={{ colors: workspaceState.colors, icons: workspaceState.icons }}
                                onDeleteWorkspace={onDeleteWorkspace}
                                onSetEditingWorkspace={setEditingWorkspaceId}
                            />
                        ))}
                    </ExpandableMenu>
                </OverlayScrollbarsComponent>
                <div className="actions">
                    {isActiveWorkspaceSaved ? (
                        <ExpandableMenuItem onClick={createWorkspace}>
                            <ExpandableMenuItemLeftElement>
                                <i className="fa-sharp fa-solid fa-plus" />
                            </ExpandableMenuItemLeftElement>
                            <div className="content">Create new workspace</div>
                        </ExpandableMenuItem>
                    ) : (
                        <ExpandableMenuItem onClick={saveWorkspace}>
                            <ExpandableMenuItemLeftElement>
                                <i className="fa-sharp fa-solid fa-floppy-disk" />
                            </ExpandableMenuItemLeftElement>
                            <div className="content">Save workspace</div>
                        </ExpandableMenuItem>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
});

export { WorkspaceSwitcher };
