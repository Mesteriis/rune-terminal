import { WaveAIModel } from "@/app/aipanel/waveai-model";
import { Button } from "@/app/element/button";
import { Modal } from "@/app/modals/modal";
import { workspaceStore } from "@/app/state/workspace.store";
import { globalStore } from "@/app/store/jotaiStore";
import { WorkspaceLayoutModel } from "@/app/workspace/workspace-layout-model";
import { getConnectionsFacade } from "@/compat/connections";
import { modalsModel } from "@/store/modalmodel";
import type { RemoteProfile } from "@/rterm-api/connections/types";
import { useEffect, useMemo, useState } from "react";

type RemoteProfileForm = {
    name: string;
    host: string;
    user: string;
    port: string;
    identityFile: string;
};

const emptyForm: RemoteProfileForm = {
    name: "",
    host: "",
    user: "",
    port: "",
    identityFile: "",
};

const RemoteProfilesModal = () => {
    const [profiles, setProfiles] = useState<RemoteProfile[]>([]);
    const [form, setForm] = useState<RemoteProfileForm>(emptyForm);
    const [workspaceSnapshot, setWorkspaceSnapshot] = useState(workspaceStore.getSnapshot());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [launchingProfileID, setLaunchingProfileID] = useState<string | null>(null);
    const [deletingProfileID, setDeletingProfileID] = useState<string | null>(null);
    const [lastOpenedSession, setLastOpenedSession] = useState<{ profileID: string; reused: boolean } | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const normalizedHost = useMemo(() => form.host.trim(), [form.host]);
    const activeWidget = workspaceSnapshot.active.widgets[workspaceSnapshot.active.activewidgetid];
    const activeProfileID =
        activeWidget && activeWidget.connectionId && activeWidget.connectionId !== "local" ? activeWidget.connectionId : null;

    const closeModal = () => modalsModel.popModal();

    const refreshProfiles = async () => {
        setLoading(true);
        try {
            const facade = await getConnectionsFacade();
            const response = await facade.listRemoteProfiles();
            setProfiles(response.profiles ?? []);
            setStatusMessage(null);
            setErrorMessage(null);
        } catch (error) {
            setStatusMessage(null);
            setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refreshProfiles();
    }, []);

    useEffect(() => {
        const unsubscribe = workspaceStore.subscribe((snapshot) => {
            setWorkspaceSnapshot(snapshot);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const handleSaveProfile = async () => {
        if (normalizedHost === "") {
            setErrorMessage("Host is required.");
            return;
        }

        const trimmedPort = form.port.trim();
        let parsedPort: number | undefined;
        if (trimmedPort !== "") {
            const value = Number(trimmedPort);
            if (!Number.isInteger(value) || value < 0 || value > 65535) {
                setErrorMessage("Port must be an integer between 0 and 65535.");
                return;
            }
            parsedPort = value;
        }

        setSaving(true);
        try {
            const facade = await getConnectionsFacade();
            const response = await facade.saveRemoteProfile({
                name: form.name.trim() || undefined,
                host: normalizedHost,
                user: form.user.trim() || undefined,
                port: parsedPort,
                identity_file: form.identityFile.trim() || undefined,
            });
            setProfiles(response.profiles ?? []);
            setForm(emptyForm);
            setStatusMessage("Profile saved.");
            setErrorMessage(null);
        } catch (error) {
            setStatusMessage(null);
            setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setSaving(false);
        }
    };

    const openProfileSession = async (profile: RemoteProfile) => {
        const facade = await getConnectionsFacade();
        const response = await facade.createSessionFromRemoteProfile(profile.id, {
            title: profile.name ? `${profile.name} Shell` : "Remote Shell",
        });
        if (response.workspace) {
            workspaceStore.hydrate(response.workspace);
        } else {
            await workspaceStore.refresh();
        }
        setLastOpenedSession({ profileID: profile.id, reused: response.reused });
        return response;
    };

    const handleLaunch = async (profile: RemoteProfile) => {
        setLaunchingProfileID(profile.id);
        try {
            const response = await openProfileSession(profile);
            setStatusMessage(
                response.reused
                    ? `Reused running session for ${profile.name || profile.host}.`
                    : `Opened new session for ${profile.name || profile.host}.`,
            );
            setErrorMessage(null);
            closeModal();
        } catch (error) {
            setStatusMessage(null);
            setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setLaunchingProfileID(null);
        }
    };

    const handlePrepareRun = async (profile: RemoteProfile) => {
        setLaunchingProfileID(profile.id);
        try {
            const response = await openProfileSession(profile);
            const model = WaveAIModel.getInstance();
            const currentInput = globalStore.get(model.inputAtom) ?? "";
            const trimmedInput = currentInput.trim();
            const nextInput = trimmedInput.startsWith("/run ") || trimmedInput.startsWith("run:")
                ? currentInput
                : "/run ";
            globalStore.set(model.inputAtom, nextInput);
            WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
            model.focusInput();
            setStatusMessage(
                `Remote target ${response.connection_id} is active. /run prompt prepared; review command before sending.`,
            );
            setErrorMessage(null);
        } catch (error) {
            setStatusMessage(null);
            setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setLaunchingProfileID(null);
        }
    };

    const handleDelete = async (profileID: string) => {
        setDeletingProfileID(profileID);
        try {
            const facade = await getConnectionsFacade();
            const response = await facade.deleteRemoteProfile(profileID);
            setProfiles(response.profiles ?? []);
            setStatusMessage("Profile deleted.");
            setErrorMessage(null);
        } catch (error) {
            setStatusMessage(null);
            setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setDeletingProfileID(null);
        }
    };

    const updateFormField = (field: keyof RemoteProfileForm, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    return (
        <Modal className="pt-6 pb-4 px-5 w-[44rem]" onClose={closeModal}>
            <div className="text-lg font-semibold text-primary mb-3">Remote Connection Profiles</div>
            <div className="grid grid-cols-2 gap-4 max-h-[70vh]">
                <div className="rounded border border-border bg-black/20 p-3 min-h-[20rem] flex flex-col">
                    <div className="text-sm text-secondary mb-2">Saved profiles</div>
                    {loading ? (
                        <div className="text-sm text-secondary">Loading...</div>
                    ) : profiles.length === 0 ? (
                        <div className="text-sm text-secondary">No saved remote profiles yet.</div>
                    ) : (
                        <div className="space-y-2 overflow-y-auto pr-1">
                            {profiles.map((profile) => (
                                <div key={profile.id} className="rounded border border-border p-2 bg-black/20">
                                    <div className="text-sm text-primary">{profile.name || profile.host}</div>
                                    <div className="text-xs text-secondary mt-1 break-all">
                                        {profile.description || profile.host}
                                        {profile.port ? `:${profile.port}` : ""}
                                    </div>
                                    {activeProfileID === profile.id ? (
                                        <div className="text-xs text-green-400 mt-1">Active session</div>
                                    ) : null}
                                    {lastOpenedSession?.profileID === profile.id ? (
                                        <div className="text-xs text-secondary mt-1">
                                            {lastOpenedSession.reused ? "Reused existing session" : "Opened new session"}
                                        </div>
                                    ) : null}
                                    {profile.identity_file ? (
                                        <div className="text-xs text-secondary mt-1 break-all">
                                            key: {profile.identity_file}
                                        </div>
                                    ) : null}
                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            className="grey"
                                            disabled={launchingProfileID === profile.id}
                                            onClick={() => void handleLaunch(profile)}
                                        >
                                            {launchingProfileID === profile.id ? "Opening..." : "Open shell"}
                                        </Button>
                                        <Button
                                            className="grey ghost"
                                            disabled={launchingProfileID === profile.id}
                                            onClick={() => void handlePrepareRun(profile)}
                                        >
                                            {launchingProfileID === profile.id ? "Preparing..." : "Prepare /run"}
                                        </Button>
                                        <Button
                                            className="grey ghost"
                                            disabled={deletingProfileID === profile.id}
                                            onClick={() => void handleDelete(profile.id)}
                                        >
                                            {deletingProfileID === profile.id ? "Deleting..." : "Delete"}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="rounded border border-border bg-black/20 p-3">
                    <div className="text-sm text-secondary mb-2">Create profile</div>
                    <div className="space-y-2">
                        <input
                            className="w-full rounded border border-border bg-panel p-2 text-sm"
                            placeholder="Name (optional)"
                            value={form.name}
                            onChange={(event) => updateFormField("name", event.target.value)}
                        />
                        <input
                            className="w-full rounded border border-border bg-panel p-2 text-sm"
                            placeholder="Host (required)"
                            value={form.host}
                            onChange={(event) => updateFormField("host", event.target.value)}
                        />
                        <input
                            className="w-full rounded border border-border bg-panel p-2 text-sm"
                            placeholder="User (optional)"
                            value={form.user}
                            onChange={(event) => updateFormField("user", event.target.value)}
                        />
                        <input
                            className="w-full rounded border border-border bg-panel p-2 text-sm"
                            placeholder="Port (optional)"
                            value={form.port}
                            onChange={(event) => updateFormField("port", event.target.value)}
                        />
                        <input
                            className="w-full rounded border border-border bg-panel p-2 text-sm"
                            placeholder="Identity file path (optional)"
                            value={form.identityFile}
                            onChange={(event) => updateFormField("identityFile", event.target.value)}
                        />
                        <div className="flex gap-2 pt-1">
                            <Button className="green" disabled={saving} onClick={() => void handleSaveProfile()}>
                                {saving ? "Saving..." : "Save profile"}
                            </Button>
                            <Button className="grey ghost" onClick={() => void refreshProfiles()}>
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            {statusMessage ? <div className="text-sm text-emerald-300 mt-3 whitespace-pre-wrap">{statusMessage}</div> : null}
            {errorMessage ? <div className="text-sm text-red-400 mt-3 whitespace-pre-wrap">{errorMessage}</div> : null}
        </Modal>
    );
};

RemoteProfilesModal.displayName = "RemoteProfilesModal";

export { RemoteProfilesModal };
