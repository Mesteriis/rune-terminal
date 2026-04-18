import type { AgentCatalog } from "@/rterm-api/agent/types";

export interface AgentSelectionStripProps {
    catalog: AgentCatalog | null;
    disabled?: boolean;
    compact?: boolean;
    onSelectProfile: (id: string) => void;
    onSelectRole: (id: string) => void;
    onSelectMode: (id: string) => void;
}

export interface SelectionFieldOption {
    id: string;
    name: string;
}

export interface SelectionFieldProps {
    id: string;
    label: string;
    value: string;
    disabled: boolean;
    compact: boolean;
    options: SelectionFieldOption[];
    onChange: (id: string) => void;
}

export function getSelectionFieldClassName(compact: boolean): string {
    return compact
        ? "flex min-w-0 items-center gap-1.5 text-[10px] text-muted"
        : "flex min-w-[8.5rem] flex-col gap-1 text-[11px] text-muted";
}

export function getSelectionLabelClassName(compact: boolean): string | undefined {
    return compact ? "shrink-0 uppercase tracking-wide text-[9px]" : undefined;
}

export function getSelectionInputClassName(compact: boolean): string {
    return compact
        ? "min-w-[5rem] rounded border border-gray-600/70 bg-zinc-800/70 px-2 py-1 text-[11px] text-white focus:border-accent focus:outline-none disabled:cursor-default disabled:opacity-60"
        : "rounded border border-gray-600/70 bg-zinc-800/70 px-2 py-1 text-xs text-white focus:border-accent focus:outline-none disabled:cursor-default disabled:opacity-60";
}

export function getSelectionStripClassName(compact: boolean): string {
    return compact
        ? "flex flex-nowrap items-center gap-2 overflow-x-auto rounded border border-gray-700/70 bg-zinc-900/70 px-2 py-1.5 shadow-sm"
        : "flex flex-wrap items-start gap-2 rounded border border-gray-700/70 bg-zinc-900/50 px-2 py-2";
}

export function getProfileOptions(catalog: AgentCatalog): SelectionFieldOption[] {
    return catalog.profiles.map((profile) => ({ id: profile.id, name: profile.name }));
}

export function getRoleOptions(catalog: AgentCatalog): SelectionFieldOption[] {
    return catalog.roles.map((role) => ({ id: role.id, name: role.name }));
}

export function getModeOptions(catalog: AgentCatalog): SelectionFieldOption[] {
    return catalog.modes.map((mode) => ({ id: mode.id, name: mode.name }));
}
