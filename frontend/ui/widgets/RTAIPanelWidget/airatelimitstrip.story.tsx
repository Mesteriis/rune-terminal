import { AIRateLimitStripTemplate } from "./airatelimitstrip.template";

const sampleRateLimitStates: Array<{ title: string; value: RateLimitInfo | null }> = [
    {
        title: "Premium nearing exhaustion",
        value: {
            req: 120,
            reqlimit: 200,
            preq: 4,
            preqlimit: 50,
            resetepoch: Math.floor(Date.now() / 1000) + 45 * 60,
            unknown: false,
        },
    },
    {
        title: "Premium exhausted, basic active",
        value: {
            req: 87,
            reqlimit: 200,
            preq: 0,
            preqlimit: 50,
            resetepoch: Math.floor(Date.now() / 1000) + 60 * 60,
            unknown: false,
        },
    },
    {
        title: "Hard limit reached",
        value: {
            req: 0,
            reqlimit: 200,
            preq: 0,
            preqlimit: 50,
            resetepoch: Math.floor(Date.now() / 1000) + 15 * 60,
            unknown: false,
        },
    },
];

function AIRateLimitStripStory() {
    return (
        <div style={{ padding: 12, maxWidth: 640, backgroundColor: "#111827", color: "#ffffff", display: "grid", gap: 8 }}>
            {sampleRateLimitStates.map((state) => (
                <div key={state.title}>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{state.title}</div>
                    <AIRateLimitStripTemplate rateLimitInfo={state.value} />
                </div>
            ))}
        </div>
    );
}

export default AIRateLimitStripStory;
