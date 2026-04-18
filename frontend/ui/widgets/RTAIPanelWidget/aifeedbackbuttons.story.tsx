import { AIFeedbackButtons } from "./aifeedbackbuttons";

function AIFeedbackButtonsStory() {
    return (
        <div style={{ padding: 12, maxWidth: 640, backgroundColor: "#111827", color: "#ffffff", display: "grid", gap: 12 }}>
            <div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Message with copy action visible</div>
                <AIFeedbackButtons messageText="Echo the workspace status and summarize next actions." />
            </div>
            <div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Empty message (copy action hidden)</div>
                <AIFeedbackButtons messageText="" />
            </div>
        </div>
    );
}

export default AIFeedbackButtonsStory;
