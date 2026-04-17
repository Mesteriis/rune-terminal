import { createCompatApiFacade } from "@/compat/api";
import type { IgnoreRule, TrustedRule } from "@/rterm-api/policy/types";
import { workspaceStore, type WorkspaceStoreLayout } from "@/app/state/workspace.store";
import { createBlock } from "@/store/global";
import { fireAndForget, makeIconClass } from "@/util/util";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { UtilitySurfaceFrame } from "./utility-surface-frame";

type SettingsView = "overview" | "trusted-tools" | "secret-shield" | "help";

const surfaceConfig: Array<{ id: string; label: string; region: string }> = [
    { id: "ai", label: "AI", region: "sidebar" },
    { id: "tools", label: "Tools", region: "utility" },
    { id: "audit", label: "Audit", region: "utility" },
    { id: "mcp", label: "MCP", region: "utility" },
];

const settingsViews: Array<{ id: SettingsView; label: string; icon: string }> = [
    { id: "overview", label: "Overview", icon: "gear" },
    { id: "trusted-tools", label: "Trusted tools", icon: "shield-check" },
    { id: "secret-shield", label: "Secret shield", icon: "lock" },
    { id: "help", label: "Help", icon: "circle-question" },
];

function hasSurface(layout: WorkspaceStoreLayout, surfaceID: string): boolean {
    return layout.surfaces.some((surface) => surface.id === surfaceID);
}

function formatTimestamp(timestamp: string): string {
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) {
        return timestamp;
    }
    return new Date(parsed).toLocaleString();
}

function describeTrustedRule(rule: TrustedRule): string {
    if (rule.matcher_type === "structured" && rule.structured != null) {
        const parts: string[] = [];
        if (Array.isArray(rule.structured.tool_names) && rule.structured.tool_names.length > 0) {
            parts.push(`tools: ${rule.structured.tool_names.join(", ")}`);
        }
        if (Array.isArray(rule.structured.widget_ids) && rule.structured.widget_ids.length > 0) {
            parts.push(`widgets: ${rule.structured.widget_ids.join(", ")}`);
        }
        if (Array.isArray(rule.structured.summary_contains) && rule.structured.summary_contains.length > 0) {
            parts.push(`summary: ${rule.structured.summary_contains.join(", ")}`);
        }
        return parts.join(" | ") || "Structured match";
    }
    return rule.matcher?.trim() || "Rule matcher unavailable";
}

function formatScope(scope: string, scopeRef?: string): string {
    if (scopeRef == null || scopeRef.trim() === "") {
        return scope;
    }
    return `${scope} (${scopeRef})`;
}

const SettingsActionButton = memo(
    ({
        label,
        icon,
        onClick,
        tone = "neutral",
    }: {
        label: string;
        icon: string;
        onClick: () => void;
        tone?: "neutral" | "accent";
    }) => {
        const toneClass =
            tone === "accent"
                ? "text-white border-[color:var(--modal-border-color)] bg-[rgba(88,193,66,0.12)] hover:bg-[rgba(88,193,66,0.18)]"
                : "text-secondary border-[color:var(--modal-border-color)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.09)] hover:text-white";
        return (
            <button
                type="button"
                className={`flex items-center gap-2 rounded border px-3 py-2 text-sm transition-colors ${toneClass}`}
                onClick={onClick}
            >
                <i className={makeIconClass(icon, false)} />
                <span>{label}</span>
            </button>
        );
    }
);

SettingsActionButton.displayName = "SettingsActionButton";

const SurfaceStateCard = memo(
    ({ title, body, tone = "default" }: { title: string; body: string; tone?: "default" | "error" }) => {
        const toneClass =
            tone === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-[color:var(--modal-border-color)] bg-[rgba(255,255,255,0.04)] text-secondary";
        return (
            <div className={`rounded border p-3 text-sm ${toneClass}`}>
                <div className="font-medium text-white">{title}</div>
                <div className="mt-1 whitespace-pre-wrap">{body}</div>
            </div>
        );
    }
);

SurfaceStateCard.displayName = "SurfaceStateCard";

const SettingsNavButton = memo(
    ({
        active,
        icon,
        label,
        onClick,
        testID,
    }: {
        active: boolean;
        icon: string;
        label: string;
        onClick: () => void;
        testID?: string;
    }) => (
        <button
            type="button"
            data-testid={testID}
            className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm transition-colors ${
                active ? "bg-[rgba(255,255,255,0.1)] text-white" : "text-secondary hover:bg-[rgba(255,255,255,0.09)] hover:text-white"
            }`}
            onClick={onClick}
        >
            <i className={makeIconClass(icon, false)} />
            <span>{label}</span>
        </button>
    ),
);

SettingsNavButton.displayName = "SettingsNavButton";

export const SettingsUtilitySurface = memo(
    ({ onClose, onOpenTools }: { onClose: () => void; onOpenTools?: () => void }) => {
        const [activeView, setActiveView] = useState<SettingsView>("overview");
        const [layout, setLayout] = useState<WorkspaceStoreLayout>(() => workspaceStore.getSnapshot().active.layout);
        const [layouts, setLayouts] = useState<WorkspaceStoreLayout[]>(() => workspaceStore.getSnapshot().active.layouts);
        const [activeLayoutId, setActiveLayoutId] = useState<string>(() => workspaceStore.getSnapshot().active.activeLayoutId);
        const [trustedRules, setTrustedRules] = useState<TrustedRule[]>([]);
        const [ignoreRules, setIgnoreRules] = useState<IgnoreRule[]>([]);
        const [policyLoading, setPolicyLoading] = useState(true);
        const [policyError, setPolicyError] = useState<string | null>(null);

        const loadPolicyState = useCallback(async (cancelRef?: { current: boolean }) => {
            setPolicyLoading(true);
            setPolicyError(null);
            try {
                const compatApi = await createCompatApiFacade();
                const [trustedResponse, ignoreResponse] = await Promise.all([
                    compatApi.clients.policy.listTrustedRules(),
                    compatApi.clients.policy.listIgnoreRules(),
                ]);
                if (cancelRef?.current) {
                    return;
                }
                setTrustedRules(
                    [...(trustedResponse.rules ?? [])].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at)),
                );
                setIgnoreRules(
                    [...(ignoreResponse.rules ?? [])].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at)),
                );
            } catch (error) {
                if (cancelRef?.current) {
                    return;
                }
                setPolicyError(error instanceof Error ? error.message : String(error));
                setTrustedRules([]);
                setIgnoreRules([]);
            } finally {
                if (!cancelRef?.current) {
                    setPolicyLoading(false);
                }
            }
        }, []);

        useEffect(() => {
            const current = workspaceStore.getSnapshot().active;
            setLayout(current.layout);
            setLayouts(current.layouts);
            setActiveLayoutId(current.activeLayoutId);

            const unsubscribe = workspaceStore.subscribe((snapshot) => {
                setLayout(snapshot.active.layout);
                setLayouts(snapshot.active.layouts);
                setActiveLayoutId(snapshot.active.activeLayoutId);
            });
            return () => unsubscribe();
        }, []);

        useEffect(() => {
            const cancelRef = { current: false };

            void (async () => {
                await loadPolicyState(cancelRef);
            })();

            return () => {
                cancelRef.current = true;
            };
        }, [loadPolicyState]);

        const applyLayout = (nextLayout: WorkspaceStoreLayout) => {
            setLayout(nextLayout);
            setActiveLayoutId(nextLayout.id);
            setLayouts((current) => {
                const next = [...current];
                const existingIndex = next.findIndex((entry) => entry.id === nextLayout.id);
                if (existingIndex >= 0) {
                    next[existingIndex] = nextLayout;
                } else {
                    next.push(nextLayout);
                }
                return next;
            });
            fireAndForget(() => workspaceStore.updateLayout(nextLayout));
        };

        const toggleSurface = (surfaceID: string, region: string, enabled: boolean) => {
            const nextSurfaces = enabled
                ? [...layout.surfaces, { id: surfaceID, region }]
                : layout.surfaces.filter((surface) => surface.id !== surfaceID);
            const dedupedSurfaces: WorkspaceStoreLayout["surfaces"] = [];
            const seen = new Set<string>();
            for (const surface of nextSurfaces) {
                if (seen.has(surface.id)) {
                    continue;
                }
                seen.add(surface.id);
                dedupedSurfaces.push(surface);
            }
            const activeSurfaceId = dedupedSurfaces.some((surface) => surface.id === layout.activeSurfaceId)
                ? layout.activeSurfaceId
                : dedupedSurfaces[0]?.id ?? "terminal";
            applyLayout({
                ...layout,
                surfaces: dedupedSurfaces,
                activeSurfaceId,
            });
        };

        const trustedRuleRows = useMemo(
            () =>
                trustedRules.map((rule) => (
                    <div
                        key={rule.id}
                        data-testid="trusted-rule-row"
                        className="rounded border border-border bg-black/10 p-3"
                    >
                        <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="font-medium text-white break-words">{describeTrustedRule(rule)}</div>
                                <div className="mt-1 text-xs text-muted">
                                    {rule.subject_type} · {formatScope(rule.scope, rule.scope_ref)}
                                </div>
                            </div>
                            <span
                                className={`shrink-0 rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                    rule.enabled ? "bg-emerald-500/15 text-emerald-200" : "bg-zinc-700 text-zinc-300"
                                }`}
                            >
                                {rule.enabled ? "enabled" : "disabled"}
                            </span>
                        </div>
                        {rule.note?.trim() ? <div className="mt-2 text-sm text-secondary">{rule.note.trim()}</div> : null}
                        <div className="mt-2 text-xs text-muted">Created {formatTimestamp(rule.created_at)}</div>
                    </div>
                )),
            [trustedRules]
        );

        const ignoreRuleRows = useMemo(
            () =>
                ignoreRules.map((rule) => (
                    <div
                        key={rule.id}
                        data-testid="ignore-rule-row"
                        className="rounded border border-border bg-black/10 p-3"
                    >
                        <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="font-medium text-white break-words">{rule.pattern}</div>
                                <div className="mt-1 text-xs text-muted">
                                    {rule.matcher_type} · {formatScope(rule.scope, rule.scope_ref)}
                                </div>
                            </div>
                            <span
                                className={`shrink-0 rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                    rule.mode === "deny"
                                        ? "bg-red-500/15 text-red-200"
                                        : rule.mode === "redact"
                                          ? "bg-amber-500/15 text-amber-200"
                                          : "bg-blue-500/15 text-blue-200"
                                }`}
                            >
                                {rule.mode}
                            </span>
                        </div>
                        {rule.note?.trim() ? <div className="mt-2 text-sm text-secondary">{rule.note.trim()}</div> : null}
                        <div className="mt-2 text-xs text-muted">Created {formatTimestamp(rule.created_at)}</div>
                    </div>
                )),
            [ignoreRules]
        );

        return (
            <UtilitySurfaceFrame
                title="Settings & Help"
                icon="gear"
                onClose={onClose}
                widthClassName="w-[min(92vw,34rem)] max-w-[34rem]"
                testID="settings-surface"
            >
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    <div className="flex w-40 shrink-0 flex-col gap-1 border-r border-border bg-black/10 p-2">
                        {settingsViews.map((view) => (
                            <SettingsNavButton
                                key={view.id}
                                active={activeView === view.id}
                                icon={view.icon}
                                label={view.label}
                                onClick={() => setActiveView(view.id)}
                                testID={`settings-view-${view.id}`}
                            />
                        ))}
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-3">
                        {activeView === "overview" ? (
                            <div className="space-y-4" data-testid="settings-overview-panel">
                                <SurfaceStateCard
                                    title="Layout"
                                    body="Switch split or focus mode, choose the active surface, and control which shell utilities are visible."
                                />

                                <div className="rounded border border-border bg-black/10 p-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">Mode</div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <button
                                            type="button"
                                            className={`rounded border px-2 py-1 text-[11px] ${
                                                layout.mode === "split"
                                                    ? "border-accent/40 bg-accent/10 text-white"
                                                    : "border-border text-secondary hover:text-white"
                                            }`}
                                            onClick={() => applyLayout({ ...layout, mode: "split" })}
                                        >
                                            Split
                                        </button>
                                        <button
                                            type="button"
                                            className={`rounded border px-2 py-1 text-[11px] ${
                                                layout.mode === "focus"
                                                    ? "border-accent/40 bg-accent/10 text-white"
                                                    : "border-border text-secondary hover:text-white"
                                            }`}
                                            onClick={() => applyLayout({ ...layout, mode: "focus" })}
                                        >
                                            Focus
                                        </button>
                                        <select
                                            className="min-w-0 flex-1 rounded border border-border bg-black/20 p-1 text-[11px] text-white"
                                            value={layout.activeSurfaceId}
                                            onChange={(event) => applyLayout({ ...layout, activeSurfaceId: event.target.value })}
                                        >
                                            {layout.surfaces.map((surface) => (
                                                <option key={surface.id} value={surface.id}>
                                                    {surface.id}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="rounded border border-border bg-black/10 p-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">Visible surfaces</div>
                                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                                        {surfaceConfig.map((surface) => {
                                            const enabled = hasSurface(layout, surface.id);
                                            return (
                                                <label key={surface.id} className="flex items-center gap-2 text-secondary">
                                                    <input
                                                        type="checkbox"
                                                        checked={enabled}
                                                        onChange={(event) => toggleSurface(surface.id, surface.region, event.target.checked)}
                                                    />
                                                    {surface.label}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="rounded border border-border bg-black/10 p-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">Saved layouts</div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <select
                                            className="min-w-0 flex-1 rounded border border-border bg-black/20 p-1 text-[11px] text-white"
                                            value={activeLayoutId}
                                            onChange={(event) => {
                                                const nextLayoutID = event.target.value;
                                                setActiveLayoutId(nextLayoutID);
                                                fireAndForget(() => workspaceStore.switchLayout(nextLayoutID));
                                            }}
                                        >
                                            {layouts.map((entry) => (
                                                <option key={entry.id} value={entry.id}>
                                                    {entry.id}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            className="rounded border border-border px-2 py-1 text-[11px] text-secondary hover:text-white"
                                            onClick={() => {
                                                fireAndForget(() => workspaceStore.saveLayout());
                                            }}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded border border-border bg-black/10 p-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">Utilities</div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <SettingsActionButton
                                            label="Open full settings"
                                            icon="gear"
                                            tone="accent"
                                            onClick={() => {
                                                createBlock({ meta: { view: "waveconfig" } }, false, true);
                                                onClose();
                                            }}
                                        />
                                        <SettingsActionButton
                                            label="Open secrets manager"
                                            icon="lock"
                                            onClick={() => {
                                                createBlock({ meta: { view: "waveconfig", file: "secrets" } }, false, true);
                                                onClose();
                                            }}
                                        />
                                        <SettingsActionButton
                                            label="Open help view"
                                            icon="circle-question"
                                            onClick={() => {
                                                createBlock({ meta: { view: "help" } });
                                                onClose();
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {activeView === "trusted-tools" ? (
                            <div className="space-y-4" data-testid="trusted-tools-panel">
                                <SurfaceStateCard
                                    title="Trusted tools"
                                    body="Repeatedly approved tools are surfaced from backend policy truth. This view is read-only; execution and rule changes remain explicit operator actions."
                                />
                                <div className="flex flex-wrap gap-2">
                                    {onOpenTools ? (
                                        <SettingsActionButton label="Open Tools" icon="screwdriver-wrench" onClick={onOpenTools} />
                                    ) : (
                                        <SurfaceStateCard
                                            title="Tools hidden by layout"
                                            body="Enable the Tools surface from Overview to add or update trusted rules explicitly."
                                        />
                                    )}
                                    <SettingsActionButton label="Refresh" icon="rotate-right" onClick={() => void loadPolicyState()} />
                                </div>
                                {policyLoading ? <SurfaceStateCard title="Loading" body="Fetching trusted-rule state from the runtime." /> : null}
                                {!policyLoading && policyError ? (
                                    <SurfaceStateCard title="Policy load failed" body={policyError} tone="error" />
                                ) : null}
                                {!policyLoading && !policyError && trustedRuleRows.length === 0 ? (
                                    <SurfaceStateCard
                                        title="No trusted rules"
                                        body="Dangerous tools still require approval unless a trusted rule is added explicitly."
                                    />
                                ) : null}
                                {!policyLoading && !policyError ? <div className="space-y-3">{trustedRuleRows}</div> : null}
                            </div>
                        ) : null}

                        {activeView === "secret-shield" ? (
                            <div className="space-y-4" data-testid="secret-shield-panel">
                                <SurfaceStateCard
                                    title="Secret shield"
                                    body="Ignore-rule protection is shown directly from runtime policy state. Modes remain explicit: deny, metadata-only, and redact."
                                />
                                <div className="flex flex-wrap gap-2">
                                    {onOpenTools ? (
                                        <SettingsActionButton label="Open Tools" icon="screwdriver-wrench" onClick={onOpenTools} />
                                    ) : (
                                        <SurfaceStateCard
                                            title="Tools hidden by layout"
                                            body="Enable the Tools surface from Overview to add or update ignore rules explicitly."
                                        />
                                    )}
                                    <SettingsActionButton label="Refresh" icon="rotate-right" onClick={() => void loadPolicyState()} />
                                </div>
                                {policyLoading ? <SurfaceStateCard title="Loading" body="Fetching ignore-rule state from the runtime." /> : null}
                                {!policyLoading && policyError ? (
                                    <SurfaceStateCard title="Policy load failed" body={policyError} tone="error" />
                                ) : null}
                                {!policyLoading && !policyError && ignoreRuleRows.length === 0 ? (
                                    <SurfaceStateCard
                                        title="No ignore rules"
                                        body="The runtime will not hide or protect matching paths unless an ignore rule is added explicitly."
                                    />
                                ) : null}
                                {!policyLoading && !policyError ? <div className="space-y-3">{ignoreRuleRows}</div> : null}
                            </div>
                        ) : null}

                        {activeView === "help" ? (
                            <div className="space-y-4" data-testid="help-panel">
                                <SurfaceStateCard
                                    title="Help"
                                    body="The active shell keeps help as an explicit operator surface. Open the dedicated help view or jump to the repo-level release docs from here."
                                />
                                <div className="flex flex-col gap-2">
                                    <SettingsActionButton
                                        label="Open help view"
                                        icon="circle-question"
                                        tone="accent"
                                        onClick={() => {
                                            createBlock({ meta: { view: "help" } });
                                            onClose();
                                        }}
                                    />
                                    <a
                                        className="rounded border border-border bg-black/10 px-3 py-2 text-sm text-secondary transition-colors hover:bg-hoverbg hover:text-white"
                                        href="https://github.com/Mesteriis/rune-terminal#readme"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <i className="fa fa-book mr-2" />
                                        Open RunaTerminal README
                                    </a>
                                    <a
                                        className="rounded border border-border bg-black/10 px-3 py-2 text-sm text-secondary transition-colors hover:bg-hoverbg hover:text-white"
                                        href="https://github.com/Mesteriis/rune-terminal/blob/main/docs/validation/validation.md"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <i className="fa fa-clipboard-check mr-2" />
                                        Open validation guide
                                    </a>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </UtilitySurfaceFrame>
        );
    }
);

SettingsUtilitySurface.displayName = "SettingsUtilitySurface";
