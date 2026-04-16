import { makeIconClass } from "@/util/util";
import { memo } from "react";
import type { CSSProperties, RefObject } from "react";
import { WidgetItem } from "./widget-item";

interface WidgetsMeasurementProps {
    measurementRef: RefObject<HTMLDivElement | null>;
    widgets: WidgetConfigType[];
    showAppsButton: boolean;
    showDevBadge: boolean;
    appsLabel: string;
    filesLabel: string;
    settingsLabel: string;
    style?: CSSProperties;
}

const WidgetsMeasurement = memo(
    ({ measurementRef, widgets, showAppsButton, showDevBadge, appsLabel, filesLabel, settingsLabel, style }: WidgetsMeasurementProps) => (
        <div
            ref={measurementRef}
            className="flex flex-col w-12 py-1 -ml-1 select-none absolute -z-10 opacity-0 pointer-events-none"
            style={style}
        >
            {widgets.map((data, idx) => (
                <WidgetItem key={`measurement-widget-${idx}`} widget={data} mode="normal" />
            ))}
            <div className="flex-grow" />
            <div className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-lg">
                <div>
                    <i className={makeIconClass("screwdriver-wrench", true, { defaultIcon: "toolbox" })}></i>
                </div>
                <div className="text-xxs mt-0.5 w-full px-0.5 text-center">Tools</div>
            </div>
            <div className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-lg">
                <div>
                    <i className={makeIconClass("clipboard-list", true, { defaultIcon: "list-check" })}></i>
                </div>
                <div className="text-xxs mt-0.5 w-full px-0.5 text-center">Audit</div>
            </div>
            <div className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-lg">
                <div>
                    <i className={makeIconClass("folder-open", true)}></i>
                </div>
                <div className="text-xxs mt-0.5 w-full px-0.5 text-center">{filesLabel}</div>
            </div>
            {showAppsButton ? (
                <div className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-lg">
                    <div>
                        <i className={makeIconClass("cube", true)}></i>
                    </div>
                    <div className="text-xxs mt-0.5 w-full px-0.5 text-center">{appsLabel}</div>
                </div>
            ) : null}
            <div className="flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-lg">
                <div>
                    <i className={makeIconClass("gear", true)}></i>
                </div>
                <div className="text-xxs mt-0.5 w-full px-0.5 text-center">{settingsLabel}</div>
            </div>
            {showDevBadge ? (
                <div className="flex justify-center items-center w-full py-1 text-accent text-[30px]" title="Running TideTerm Dev Build">
                    <i className="fa fa-brands fa-dev fa-fw" />
                </div>
            ) : null}
        </div>
    )
);

WidgetsMeasurement.displayName = "WidgetsMeasurement";

export { WidgetsMeasurement };
