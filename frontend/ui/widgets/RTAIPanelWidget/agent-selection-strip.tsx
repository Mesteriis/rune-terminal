import type { AgentCatalog } from "@/rterm-api/agent/types";
import { memo } from "react";

interface AgentSelectionStripProps {
    catalog: AgentCatalog | null;
    disabled?: boolean;
    compact?: boolean;
    onSelectProfile: (id: string) => void;
    onSelectRole: (id: string) => void;
    onSelectMode: (id: string) => void;
}

interface SelectionFieldProps {
    id: string;
    label: string;
    value: string;
    disabled: boolean;
    compact: boolean;
    options: Array<{ id: string; name: string }>;
    onChange: (id: string) => void;
}

const SelectionField = memo(({ id, label, value, disabled, compact, options, onChange }: SelectionFieldProps) => {
    return (
        <label
            className={
                compact
                    ? "flex min-w-0 items-center gap-1.5 text-[10px] text-muted"
                    : "flex min-w-[8.5rem] flex-col gap-1 text-[11px] text-muted"
            }
        >
            <span className={compact ? "shrink-0 uppercase tracking-wide text-[9px]" : undefined}>{label}</span>
            <select
                id={id}
                data-testid={id}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className={
                    compact
                        ? "min-w-[5rem] rounded border border-gray-600/70 bg-zinc-800/70 px-2 py-1 text-[11px] text-white focus:border-accent focus:outline-none disabled:cursor-default disabled:opacity-60"
                        : "rounded border border-gray-600/70 bg-zinc-800/70 px-2 py-1 text-xs text-white focus:border-accent focus:outline-none disabled:cursor-default disabled:opacity-60"
                }
            >
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
        </label>
    );
});

SelectionField.displayName = "SelectionField";

export const AgentSelectionStrip = memo(
    ({ catalog, disabled = false, compact = false, onSelectProfile, onSelectRole, onSelectMode }: AgentSelectionStripProps) => {
        if (catalog == null) {
            return null;
        }

        return (
            <div
                data-testid="ai-mode-strip"
                className={
                    compact
                        ? "flex flex-nowrap items-center gap-2 overflow-x-auto rounded border border-gray-700/70 bg-zinc-900/70 px-2 py-1.5 shadow-sm"
                        : "flex flex-wrap items-start gap-2 rounded border border-gray-700/70 bg-zinc-900/50 px-2 py-2"
                }
            >
                <SelectionField
                    id="agent-profile-select"
                    label="Profile"
                    value={catalog.active.profile.id}
                    disabled={disabled}
                    compact={compact}
                    options={catalog.profiles.map((profile) => ({ id: profile.id, name: profile.name }))}
                    onChange={onSelectProfile}
                />
                <SelectionField
                    id="agent-role-select"
                    label="Role"
                    value={catalog.active.role.id}
                    disabled={disabled}
                    compact={compact}
                    options={catalog.roles.map((role) => ({ id: role.id, name: role.name }))}
                    onChange={onSelectRole}
                />
                <SelectionField
                    id="agent-mode-select"
                    label="Mode"
                    value={catalog.active.mode.id}
                    disabled={disabled}
                    compact={compact}
                    options={catalog.modes.map((mode) => ({ id: mode.id, name: mode.name }))}
                    onChange={onSelectMode}
                />
            </div>
        );
    }
);

AgentSelectionStrip.displayName = "AgentSelectionStrip";
