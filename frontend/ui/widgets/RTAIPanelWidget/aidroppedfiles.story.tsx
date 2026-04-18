import * as jotai from "jotai";
import { Provider } from "jotai";
import { useMemo } from "react";
import { AIDroppedFiles } from "./aidroppedfiles";
import type { AIDroppedFile, AIDroppedFilesModel } from "./aidroppedfiles.logic";

function createStoryFiles(): AIDroppedFile[] {
    return [
        {
            id: "image-1",
            file: new File(["image"], "diagram.png", { type: "image/png" }),
            name: "diagram.png",
            type: "image/png",
            size: 42183,
            previewUrl:
                "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
        },
        {
            id: "doc-1",
            file: new File(["notes"], "notes.md", { type: "text/markdown" }),
            name: "notes.md",
            type: "text/markdown",
            size: 2048,
            localPath: "/workspace/docs/notes.md",
            attachmentReference: {
                id: "attachment-doc-1",
                path: "/workspace/docs/notes.md",
                name: "notes.md",
                mime_type: "text/markdown",
                size: 2048,
                modified_time: 1713398400,
            },
            attachmentState: "ready",
            consumptionHint: "metadata_only",
        },
        {
            id: "missing-1",
            file: new File(["missing"], "missing.sql", { type: "application/sql" }),
            name: "missing.sql",
            type: "application/sql",
            size: 512,
            localPath: "/workspace/sql/missing.sql",
            attachmentReference: {
                id: "attachment-missing-1",
                path: "/workspace/sql/missing.sql",
                name: "missing.sql",
                mime_type: "application/sql",
                size: 512,
                modified_time: 1713398400,
            },
            attachmentState: "missing",
        },
    ];
}

function createStoryModel(): { model: AIDroppedFilesModel; store: ReturnType<typeof jotai.createStore> } {
    const initialFiles = createStoryFiles();
    const droppedFilesAtom = jotai.atom<AIDroppedFile[]>(initialFiles);
    const store = jotai.createStore();

    store.set(droppedFilesAtom, initialFiles);

    const model: AIDroppedFilesModel = {
        droppedFiles: droppedFilesAtom,
        removeFile: (fileId: string) => {
            store.set(droppedFilesAtom, (currentFiles) => currentFiles.filter((file) => file.id !== fileId));
        },
    };

    return { model, store };
}

function AIDroppedFilesStory() {
    const { model, store } = useMemo(() => createStoryModel(), []);

    return (
        <Provider store={store}>
            <div style={{ padding: 12, maxWidth: 640, backgroundColor: "#111827", color: "#ffffff" }}>
                <AIDroppedFiles model={model} />
            </div>
        </Provider>
    );
}

export default AIDroppedFilesStory;
