import { Button } from "@/app/element/button";
import { Modal } from "@/app/modals/modal";
import { workspaceStore } from "@/app/state/workspace.store";
import { getConnectionsFacade } from "@/compat";
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [launchingProfileID, setLaunchingProfileID] = useState<string | null>(null);
    const [deletingProfileID, setDeletingProfileID] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const normalizedHost = useMemo(() => form.host.trim(), [form.host]);

    const closeModal = () => modalsModel.popModal();

    const refreshProfiles = async () => {
        setLoading(true);
        try {
            const facade = await getConnectionsFacade();
            const response = await facade.listRemoteProfiles();
            setProfiles(response.profiles ?? []);
            setErrorMessage(null);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refreshProfiles();
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
            setErrorMessage(null);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setSaving(false);
        }
    };

    const handleLaunch = async (profile: RemoteProfile) => {
        setLaunchingProfileID(profile.id);
        try {
            const facade = await getConnectionsFacade();
            await facade.createSessionFromRemoteProfile(profile.id, {
                title: profile.name ? `${profile.name} Shell` : "Remote Shell",
            });
            await workspaceStore.refresh();
            setErrorMessage(null);
            closeModal();
        } catch (error) {
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
            setErrorMessage(null);
        } catch (error) {
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
            {errorMessage ? <div className="text-sm text-red-400 mt-3 whitespace-pre-wrap">{errorMessage}</div> : null}
        </Modal>
    );
};

RemoteProfilesModal.displayName = "RemoteProfilesModal";

export { RemoteProfilesModal };
