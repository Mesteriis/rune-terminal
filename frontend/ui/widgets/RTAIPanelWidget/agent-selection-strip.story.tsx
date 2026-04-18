import type { AgentCatalog, PromptProfile, RolePreset, WorkMode } from "@/rterm-api/agent/types";
import { AgentSelectionStrip } from "./agent-selection-strip";

const defaultProfile: PromptProfile = {
    id: "balanced",
    name: "Balanced",
    description: "Balanced assistance",
    system_prompt: "Use balanced guidance.",
    overlay: {},
};

const reviewerRole: RolePreset = {
    id: "reviewer",
    name: "Reviewer",
    description: "Focus on correctness and risk",
    prompt: "Review changes and surface risks.",
    overlay: {},
};

const buildMode: WorkMode = {
    id: "build",
    name: "Build",
    description: "Implement targeted changes",
    prompt: "Implement requested edits with strict scope.",
    overlay: {},
};

const mockCatalog: AgentCatalog = {
    profiles: [defaultProfile],
    roles: [reviewerRole],
    modes: [buildMode],
    active: {
        profile: defaultProfile,
        role: reviewerRole,
        mode: buildMode,
        effective_prompt: "Use balanced guidance. Review changes and surface risks.",
        effective_policy_profile: {},
    },
};

function AgentSelectionStripStory() {
    return (
        <div style={{ padding: 12, backgroundColor: "#111827", color: "#ffffff" }}>
            <AgentSelectionStrip
                catalog={mockCatalog}
                compact={true}
                onSelectProfile={() => {}}
                onSelectRole={() => {}}
                onSelectMode={() => {}}
            />
        </div>
    );
}

export default AgentSelectionStripStory;
