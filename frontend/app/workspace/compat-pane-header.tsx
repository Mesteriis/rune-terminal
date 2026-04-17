import { makeIconClass } from "@/util/util";
import clsx from "clsx";
import type { ReactNode } from "react";

type CompatPaneBadgeTone = "neutral" | "success" | "warning" | "error" | "info";
type CompatPaneMessageTone = "default" | "success" | "warning" | "error";

interface CompatPaneBadge {
    label: string;
    tone?: CompatPaneBadgeTone;
    icon?: string;
    title?: string;
}

interface CompatPaneAction {
    icon: string;
    label: string;
    title?: string;
    disabled?: boolean;
    spin?: boolean;
    onClick: () => void;
    testID?: string;
}

interface CompatPaneMessage {
    text: string;
    tone?: CompatPaneMessageTone;
}

interface CompatPaneHeaderProps {
    icon: string;
    title: string;
    subtitle?: string;
    badges?: CompatPaneBadge[];
    actions?: CompatPaneAction[];
    extraActions?: ReactNode;
    dragTitle: string;
    message?: CompatPaneMessage | null;
    testID?: string;
}

function badgeToneClass(tone: CompatPaneBadgeTone = "neutral"): string {
    switch (tone) {
        case "success":
            return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
        case "warning":
            return "border-amber-400/30 bg-amber-500/10 text-amber-200";
        case "error":
            return "border-red-400/30 bg-red-500/10 text-red-200";
        case "info":
            return "border-cyan-400/30 bg-cyan-500/10 text-cyan-200";
        default:
            return "border-border/70 bg-black/20 text-secondary";
    }
}

function messageToneClass(tone: CompatPaneMessageTone = "default"): string {
    switch (tone) {
        case "success":
            return "text-emerald-300";
        case "warning":
            return "text-amber-300";
        case "error":
            return "text-red-300";
        default:
            return "text-secondary";
    }
}

export function CompatPaneHeader({
    icon,
    title,
    subtitle,
    badges = [],
    actions = [],
    extraActions,
    dragTitle,
    message,
    testID,
}: CompatPaneHeaderProps) {
    return (
        <div className="border-b border-border/60 bg-[rgba(17,18,17,0.34)]">
            <div
                className="flex h-[30px] items-center gap-2 px-[10px]"
                data-testid={testID}
            >
                <div
                    className="flex shrink-0 items-center gap-1 text-[11px] text-secondary"
                    title={dragTitle}
                >
                    <i className={makeIconClass("grip-vertical", false)} />
                    <i className={makeIconClass(icon, false)} />
                </div>
                <div className="min-w-0 flex flex-1 items-center gap-1.5 overflow-hidden">
                    <div className="truncate text-[11px] font-medium text-white">{title}</div>
                    {badges.map((badge) => (
                        <span
                            key={`${badge.label}:${badge.icon ?? ""}`}
                            className={clsx(
                                "inline-flex h-[18px] shrink-0 items-center gap-1 rounded-sm border px-1.5 text-[9px] font-medium uppercase tracking-[0.08em]",
                                badgeToneClass(badge.tone),
                            )}
                            title={badge.title}
                        >
                            {badge.icon ? <i className={makeIconClass(badge.icon, false)} /> : null}
                            {badge.label}
                        </span>
                    ))}
                    {subtitle ? (
                        <div className="min-w-0 truncate text-[11px] text-secondary">
                            {subtitle}
                        </div>
                    ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                    {extraActions}
                    {actions.map((action) => (
                        <button
                            key={`${action.label}:${action.icon}`}
                            type="button"
                            className="flex h-[22px] w-[22px] items-center justify-center rounded text-[10px] text-secondary transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-white disabled:opacity-45"
                            aria-label={action.label}
                            title={action.title ?? action.label}
                            disabled={action.disabled}
                            onClick={(event) => {
                                event.stopPropagation();
                                action.onClick();
                            }}
                            data-testid={action.testID}
                        >
                            <i className={makeIconClass(action.icon, false, { spin: action.spin })} />
                        </button>
                    ))}
                </div>
            </div>
            {message?.text ? (
                <div className={clsx("border-t border-border/50 px-[10px] py-1 text-[10px]", messageToneClass(message.tone))}>
                    {message.text}
                </div>
            ) : null}
        </div>
    );
}
