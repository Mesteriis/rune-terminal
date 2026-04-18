import { memo } from "react";
import {
    type AgentSelectionStripProps,
    type SelectionFieldProps,
    getModeOptions,
    getProfileOptions,
    getRoleOptions,
    getSelectionFieldClassName,
    getSelectionInputClassName,
    getSelectionLabelClassName,
    getSelectionStripClassName,
} from "./agent-selection-strip.logic";
import "./agent-selection-strip.style.scss";

const SelectionField = memo(({ id, label, value, disabled, compact, options, onChange }: SelectionFieldProps) => {
    return (
        <label className={getSelectionFieldClassName(compact)}>
            <span className={getSelectionLabelClassName(compact)}>{label}</span>
            <select
                id={id}
                data-testid={id}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className={getSelectionInputClassName(compact)}
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
            <div data-testid="ai-mode-strip" className={getSelectionStripClassName(compact)}>
                <SelectionField
                    id="agent-profile-select"
                    label="Profile"
                    value={catalog.active.profile.id}
                    disabled={disabled}
                    compact={compact}
                    options={getProfileOptions(catalog)}
                    onChange={onSelectProfile}
                />
                <SelectionField
                    id="agent-role-select"
                    label="Role"
                    value={catalog.active.role.id}
                    disabled={disabled}
                    compact={compact}
                    options={getRoleOptions(catalog)}
                    onChange={onSelectRole}
                />
                <SelectionField
                    id="agent-mode-select"
                    label="Mode"
                    value={catalog.active.mode.id}
                    disabled={disabled}
                    compact={compact}
                    options={getModeOptions(catalog)}
                    onChange={onSelectMode}
                />
            </div>
        );
    }
);

AgentSelectionStrip.displayName = "AgentSelectionStrip";
