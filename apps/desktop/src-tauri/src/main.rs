use rand::distr::{Alphanumeric, SampleString};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::env;
use std::fmt::{self, Display};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager, State};
use thiserror::Error;

#[derive(Default)]
struct RuntimeState {
    inner: Mutex<Option<RuntimeRuntime>>,
}

struct RuntimeRuntime {
    core: RuntimeProcess,
    watcher: Option<RuntimeProcess>,
    settings: SettingsFile,
}

struct RuntimeProcess {
    child: Option<Child>,
    pid: u32,
    url: String,
    started_by_ui: bool,
    auth_token: Option<String>,
    worker_id: Option<String>,
    shutdown_token: Option<String>,
}

#[derive(Debug, Clone)]
struct RuntimeProcessRecord {
    pid: u32,
    url: String,
    started_by_ui: bool,
    auth_token: Option<String>,
    worker_id: Option<String>,
    shutdown_token: Option<String>,
}

#[derive(Debug, Serialize)]
struct RuntimeInfo {
    base_url: String,
    auth_token: String,
}

#[derive(Debug, Serialize)]
struct RuntimeShutdownResult {
    can_close: bool,
    active_tasks: usize,
    watcher_mode: String,
}

#[derive(Debug, Serialize)]
struct RuntimeSettingsPayload {
    watcher_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
enum WatcherMode {
    #[default]
    Ephemeral,
    Persistent,
}

impl Display for WatcherMode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Ephemeral => f.write_str("ephemeral"),
            Self::Persistent => f.write_str("persistent"),
        }
    }
}

impl WatcherMode {
    fn from_input(value: &str) -> Option<Self> {
        match value {
            "ephemeral" => Some(Self::Ephemeral),
            "persistent" => Some(Self::Persistent),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct SettingsFile {
    #[serde(default)]
    watcher_mode: WatcherMode,
    #[serde(default)]
    core_auth_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RuntimeFile {
    #[serde(default)]
    core: Option<RuntimeFileCore>,
    #[serde(default)]
    watcher: Option<RuntimeFileWatcher>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RuntimeFileCore {
    pid: u32,
    url: String,
    started_by_ui: bool,
    auth_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RuntimeFileWatcher {
    pid: u32,
    url: String,
    #[serde(default)]
    worker_id: Option<String>,
    #[serde(default)]
    shutdown_token: Option<String>,
    started_by_ui: bool,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
struct ReadyFilePayload {
    base_url: String,
    pid: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct HealthPayload {
    service: String,
    status: String,
    pid: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct WatcherStatePayload {
    backend_url: String,
    #[serde(default)]
    worker_id: Option<String>,
    #[serde(default)]
    shutdown_token: Option<String>,
}

const WATCHER_LISTEN_ADDR: &str = "127.0.0.1:7788";

#[derive(Debug, Error)]
enum RuntimeError {
    #[error("core binary not found; set RTERM_CORE_BIN or build core")]
    BinaryNotFound,
    #[error("failed to create runtime path: {0}")]
    Path(String),
    #[error("failed to spawn process: {0}")]
    Spawn(String),
    #[error("failed to read ready payload: {0}")]
    Ready(String),
    #[error("request failed: {0}")]
    Http(String),
    #[error("invalid runtime payload: {0}")]
    RuntimePayload(String),
}

#[derive(Debug)]
struct StartContext {
    binary: PathBuf,
    workspace_root: PathBuf,
    state_dir: PathBuf,
}

#[tauri::command]
fn runtime_info(state: State<'_, RuntimeState>) -> Result<RuntimeInfo, String> {
    let guard = state.inner.lock().map_err(|err| err.to_string())?;
    let runtime = guard
        .as_ref()
        .ok_or_else(|| "core runtime is not available".to_string())?;
    let auth_token = runtime
        .core
        .auth_token
        .clone()
        .ok_or_else(|| "core auth token is not available".to_string())?;

    Ok(RuntimeInfo {
        base_url: runtime.core.url.clone(),
        auth_token,
    })
}

#[tauri::command]
fn runtime_settings(state: State<'_, RuntimeState>) -> Result<RuntimeSettingsPayload, String> {
    let guard = state.inner.lock().map_err(|err| err.to_string())?;
    let watcher_mode = guard
        .as_ref()
        .map(|runtime| runtime.settings.watcher_mode.clone())
        .unwrap_or_default();

    Ok(RuntimeSettingsPayload {
        watcher_mode: watcher_mode.to_string(),
    })
}

#[tauri::command]
fn set_watcher_mode(state: State<'_, RuntimeState>, mode: String) -> Result<(), String> {
    let parsed = WatcherMode::from_input(&mode.to_lowercase())
        .ok_or_else(|| format!("invalid watcher mode: {mode}"))?;

    let mut guard = state.inner.lock().map_err(|err| err.to_string())?;
    let mut settings = guard
        .as_ref()
        .map(|runtime| runtime.settings.clone())
        .unwrap_or_default();
    settings.watcher_mode = parsed;

    if let Some(runtime) = guard.as_mut() {
        runtime.settings = settings.clone();
    }

    save_settings(&settings).map_err(|err| err.to_string())
}

#[tauri::command]
fn request_shutdown(state: State<'_, RuntimeState>, force: bool) -> Result<RuntimeShutdownResult, String> {
    let mut guard = state.inner.lock().map_err(|err| err.to_string())?;
    let Some(runtime) = guard.as_mut() else {
        return Ok(RuntimeShutdownResult {
            can_close: true,
            active_tasks: 0,
            watcher_mode: WatcherMode::Ephemeral.to_string(),
        });
    };

    let watcher_mode = runtime.settings.watcher_mode.clone();
    if matches!(watcher_mode, WatcherMode::Persistent) {
        return Ok(RuntimeShutdownResult {
            can_close: true,
            active_tasks: 0,
            watcher_mode: watcher_mode.to_string(),
        });
    }

    let auth_token = runtime
        .core
        .auth_token
        .clone()
        .ok_or_else(|| "core auth token is not available".to_string())?;
    let active_tasks = query_active_tasks(&runtime.core.url, &auth_token).map_err(|err| err.to_string())?;
    if !force && active_tasks > 0 {
        return Ok(RuntimeShutdownResult {
            can_close: false,
            active_tasks,
            watcher_mode: watcher_mode.to_string(),
        });
    }

    shutdown_runtime(runtime).map_err(|err| err.to_string())?;
    clear_runtime_file();
    let watcher_mode = watcher_mode.to_string();
    *guard = None;

    Ok(RuntimeShutdownResult {
        can_close: true,
        active_tasks,
        watcher_mode,
    })
}

#[tauri::command]
fn close_window(window: tauri::Window) -> Result<(), String> {
    window
        .close()
        .map_err(|err| format!("unable to close window: {err}"))
}

fn main() {
    let runtime_state = RuntimeState::default();

    tauri::Builder::default()
        .manage(runtime_state)
        .setup(|app| {
            let state = app.state::<RuntimeState>();
            start_or_attach_runtime(&app.app_handle(), &state)
                .map_err(|err| tauri::Error::Anyhow(anyhow::anyhow!(err.to_string())))?;
            install_signal_cleanup(&app.app_handle())
                .map_err(|err| tauri::Error::Anyhow(anyhow::anyhow!(err.to_string())))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            runtime_info,
            runtime_settings,
            set_watcher_mode,
            request_shutdown,
            close_window
        ])
        .build(tauri::generate_context!())
        .expect("failed to build tauri app")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                cleanup_runtime_state(&app.state::<RuntimeState>());
            }
        });
}

fn install_signal_cleanup(app: &AppHandle) -> Result<(), RuntimeError> {
    let app_handle = app.clone();
    let cleanup_started = Arc::new(AtomicBool::new(false));
    let cleanup_guard = Arc::clone(&cleanup_started);

    ctrlc::set_handler(move || {
        if cleanup_guard.swap(true, Ordering::SeqCst) {
            return;
        }

        cleanup_runtime_state(&app_handle.state::<RuntimeState>());
        app_handle.exit(0);
    })
    .map_err(|err| RuntimeError::Path(format!("failed to install signal handler: {err}")))
}

fn start_or_attach_runtime(app: &AppHandle, state: &RuntimeState) -> Result<(), RuntimeError> {
    let core_binary = core_binary_candidates()
        .into_iter()
        .find(|path| path.exists())
        .ok_or(RuntimeError::BinaryNotFound)?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| RuntimeError::Path(err.to_string()))?;
    let state_dir = app_data_dir.join("core");
    fs::create_dir_all(&state_dir).map_err(|err| RuntimeError::Path(err.to_string()))?;

    let mut settings = load_settings();
    let attachment = read_runtime_attachment();

    let context = StartContext {
        binary: core_binary,
        workspace_root: default_workspace_root(),
        state_dir,
    };

    let mut core = if let Some(record) = attachment.core {
        let token = settings
            .core_auth_token
            .clone()
            .or(record.auth_token)
            .unwrap_or_else(random_token);
        RuntimeProcess {
            child: None,
            pid: record.pid,
            url: record.url,
            started_by_ui: record.started_by_ui,
            auth_token: Some(token),
            worker_id: None,
            shutdown_token: None,
        }
    } else {
        let token = settings.core_auth_token.clone().unwrap_or_else(random_token);
        spawn_core(&context, &token)?
    };

    if core.pid == 0 {
        return Err(RuntimeError::RuntimePayload("core pid is zero".into()));
    }
    core.started_by_ui = core.child.is_some() || core.started_by_ui;
    settings.core_auth_token = core.auth_token.clone();
    let spawned_core_for_this_launch = core.child.is_some();

    let watcher_record = match recover_or_drop_watcher_record(
        attachment.watcher,
        &core.url,
        validate_watcher_entry_for_core_record,
        cleanup_stale_watcher_record,
    ) {
        Ok(record) => record,
        Err(err) => {
            if spawned_core_for_this_launch {
                stop_process(&mut core);
            }
            return Err(err);
        }
    };

    let watcher = if let Some(record) = watcher_record {
        RuntimeProcess {
            child: None,
            pid: record.pid,
            url: record.url,
            started_by_ui: record.started_by_ui,
            auth_token: None,
            worker_id: record.worker_id,
            shutdown_token: record.shutdown_token,
        }
    } else {
        match spawn_watcher(&context, &core.url, core.auth_token.as_deref()) {
            Ok(watcher) => watcher,
            Err(err) => {
                if spawned_core_for_this_launch {
                    stop_process(&mut core);
                }
                return Err(err);
            }
        }
    };

    let runtime = RuntimeRuntime {
        core,
        watcher: Some(watcher),
        settings,
    };

    write_runtime_file(&runtime.core, runtime.watcher.as_ref())?;
    save_settings(&runtime.settings)?;
    *state.inner.lock().map_err(|err| RuntimeError::Path(err.to_string()))? = Some(runtime);

    Ok(())
}

fn shutdown_runtime(runtime: &mut RuntimeRuntime) -> Result<(), RuntimeError> {
    if let Some(watcher) = runtime.watcher.as_mut() {
        if watcher.started_by_ui {
            graceful_shutdown_watcher(watcher)?;
        }
    }

    if runtime.core.started_by_ui {
        stop_process(&mut runtime.core);
    }
    Ok(())
}

fn cleanup_runtime_state(state: &State<'_, RuntimeState>) {
    if let Ok(mut guard) = state.inner.lock() {
        cleanup_runtime_slot(&mut guard, clear_runtime_file);
    }
}

fn cleanup_runtime_slot<F>(slot: &mut Option<RuntimeRuntime>, mut clear_runtime_file_fn: F)
where
    F: FnMut(),
{
    if let Some(runtime) = slot.as_mut() {
        let is_persistent = matches!(runtime.settings.watcher_mode, WatcherMode::Persistent);
        if !is_persistent {
            let _ = shutdown_runtime(runtime);
            clear_runtime_file_fn();
        }
    }

    *slot = None;
}

fn graceful_shutdown_watcher(watcher: &mut RuntimeProcess) -> Result<(), RuntimeError> {
    if !is_owned_watcher(watcher) {
        return Ok(());
    }

    request_graceful_watcher_shutdown(watcher)
}

fn request_graceful_watcher_shutdown(watcher: &mut RuntimeProcess) -> Result<(), RuntimeError> {
    if watcher.worker_id.is_none() || watcher.shutdown_token.is_none() {
        return Err(RuntimeError::Http(
            "watcher shutdown requires worker identity and token".into(),
        ));
    }

    let token = watcher
        .shutdown_token
        .as_ref()
        .expect("shutdown token required for controlled watcher");
    let worker_id = watcher
        .worker_id
        .as_ref()
        .expect("worker id required for controlled watcher");

    let client = create_http_client();
    let endpoint = format!(
        "{}/watcher/shutdown?token={}&worker_id={}",
        watcher.url, token, worker_id
    );
    let response = client
        .post(endpoint)
        .send()
        .and_then(|value| value.error_for_status());

    if response.is_err() {
        stop_process(watcher);
        if !wait_for_service_down(&format!("{}/health", watcher.url), Duration::from_secs(5)) {
            return Err(RuntimeError::Http(
                "watcher process did not terminate after kill fallback".into(),
            ));
        }
        return Ok(());
    }

    if wait_for_service_down(&format!("{}/health", watcher.url), Duration::from_secs(5)) {
        return Ok(());
    }

    stop_process(watcher);
    if wait_for_service_down(&format!("{}/health", watcher.url), Duration::from_secs(5)) {
        Ok(())
    } else {
        Err(RuntimeError::Http(
            "watcher did not reach terminal shutdown state".into(),
        ))
    }
}

fn is_owned_watcher(process: &RuntimeProcess) -> bool {
    process.started_by_ui && process.worker_id.is_some() && process.shutdown_token.is_some()
}

fn cleanup_stale_watcher_record(record: &RuntimeProcessRecord) -> Result<(), RuntimeError> {
    let mut process = RuntimeProcess {
        child: None,
        pid: record.pid,
        url: record.url.clone(),
        started_by_ui: record.started_by_ui,
        auth_token: None,
        worker_id: record.worker_id.clone(),
        shutdown_token: record.shutdown_token.clone(),
    };

    if process.worker_id.is_some() && process.shutdown_token.is_some() {
        match request_graceful_watcher_shutdown(&mut process) {
            Ok(()) => return Ok(()),
            Err(_) => {
                stop_process(&mut process);
            }
        }
    } else {
        stop_process(&mut process);
    }

    if wait_for_service_down(&format!("{}/health", process.url), Duration::from_secs(5)) {
        Ok(())
    } else {
        Err(RuntimeError::Http(
            "stale watcher did not terminate before respawn".into(),
        ))
    }
}

fn recover_or_drop_watcher_record<FValidate, FCleanup>(
    record: Option<RuntimeProcessRecord>,
    expected_core_url: &str,
    mut validate: FValidate,
    mut cleanup: FCleanup,
) -> Result<Option<RuntimeProcessRecord>, RuntimeError>
where
    FValidate: FnMut(&RuntimeProcessRecord, &str) -> Option<RuntimeProcessRecord>,
    FCleanup: FnMut(&RuntimeProcessRecord) -> Result<(), RuntimeError>,
{
    let Some(record) = record else {
        return Ok(None);
    };

    if let Some(valid) = validate(&record, expected_core_url) {
        return Ok(Some(valid));
    }

    cleanup(&record)?;
    Ok(None)
}

fn spawn_core(context: &StartContext, token: &str) -> Result<RuntimeProcess, RuntimeError> {
    let ready_file = context.state_dir.join("runtime-ready.json");
    let _ = fs::remove_file(&ready_file);

    let child = Command::new(&context.binary)
        .arg("serve")
        .arg("--listen")
        .arg("127.0.0.1:0")
        .arg("--workspace-root")
        .arg(&context.workspace_root)
        .arg("--state-dir")
        .arg(&context.state_dir)
        .arg("--ready-file")
        .arg(&ready_file)
        .env("RTERM_AUTH_TOKEN", token)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|err| RuntimeError::Spawn(err.to_string()))?;

    let ready = wait_for_ready_file(&ready_file)?;
    wait_for_health_service(&format!("{}/api/v1/health", ready.base_url), "rterm-core")
        .map_err(|err| RuntimeError::Http(format!("core unhealthy after spawn: {err}")))?;

    Ok(RuntimeProcess {
        child: Some(child),
        pid: ready.pid,
        url: ready.base_url,
        started_by_ui: true,
        auth_token: Some(token.to_string()),
        worker_id: None,
        shutdown_token: None,
    })
}

fn spawn_watcher(
    context: &StartContext,
    core_url: &str,
    backend_auth_token: Option<&str>,
) -> Result<RuntimeProcess, RuntimeError> {
    let worker_id = format!("watcher_{}", random_token_n(12));
    let shutdown_token = random_token_n(32);
    let mut command = Command::new(&context.binary);
    command
        .arg("watcher")
        .arg(format!("--backend={core_url}"))
        .arg(format!("--listen={WATCHER_LISTEN_ADDR}"))
        .arg(format!("--worker-id={worker_id}"))
        .arg(format!("--shutdown-token={shutdown_token}"))
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());
    if let Some(token) = backend_auth_token {
        command.env("RTERM_BACKEND_AUTH_TOKEN", token);
    }
    let child = command
        .spawn()
        .map_err(|err| RuntimeError::Spawn(err.to_string()))?;

    let base_url = format!("http://{}", WATCHER_LISTEN_ADDR);
    let health = wait_for_health_service_with_retry(&format!("{}/health", base_url), "rterm-watcher")
        .ok_or_else(|| RuntimeError::Http("watcher did not become healthy".into()))?;
    let state_url = format!("{}/watcher/state", base_url);
    let state = request_watcher_state(&state_url)?;
    if state.worker_id.as_deref() != Some(&worker_id) {
        return Err(RuntimeError::RuntimePayload(
            "watcher state returned unexpected worker identity".into(),
        ));
    }
    if state.shutdown_token.as_deref() != Some(&shutdown_token) {
        return Err(RuntimeError::RuntimePayload(
            "watcher state returned unexpected shutdown token".into(),
        ));
    }

    Ok(RuntimeProcess {
        child: Some(child),
        pid: health.pid,
        url: base_url,
        started_by_ui: true,
        auth_token: None,
        worker_id: Some(worker_id),
        shutdown_token: Some(shutdown_token),
    })
}

fn read_runtime_attachment() -> RuntimeAttachment {
    let Some(path) = runtime_file_path() else {
        return RuntimeAttachment::default();
    };
    let file = match read_json_file::<RuntimeFile>(&path) {
        Some(file) => file,
        None => return RuntimeAttachment::default(),
    };

    let core = file.core.and_then(validate_core_entry);
    let watcher = if let Some(core) = core.as_ref() {
        file.watcher
            .as_ref()
            .and_then(|watcher| validate_watcher_entry_for_core(watcher, Some(&core.url)))
    } else {
        file.watcher.and_then(validate_watcher_entry)
    };
    RuntimeAttachment { core, watcher }
}

fn validate_core_entry(entry: RuntimeFileCore) -> Option<RuntimeProcessRecord> {
    if entry.pid == 0 || entry.url.trim().is_empty() {
        return None;
    }

    let health_url = format!("{}/api/v1/health", entry.url);
    let health = wait_for_health_service(&health_url, "rterm-core").ok()?;
    if health.pid != entry.pid {
        return None;
    }

    Some(RuntimeProcessRecord {
        pid: health.pid,
        url: entry.url,
        started_by_ui: entry.started_by_ui,
        auth_token: entry.auth_token,
        worker_id: None,
        shutdown_token: None,
    })
}

fn validate_watcher_entry(entry: RuntimeFileWatcher) -> Option<RuntimeProcessRecord> {
    validate_watcher_entry_for_core(&entry, None)
}

fn validate_watcher_entry_for_core_record(
    entry: &RuntimeProcessRecord,
    expected_core_url: &str,
) -> Option<RuntimeProcessRecord> {
    validate_watcher_entry_for_core(
        &RuntimeFileWatcher {
            pid: entry.pid,
            url: entry.url.clone(),
            worker_id: entry.worker_id.clone(),
            shutdown_token: entry.shutdown_token.clone(),
            started_by_ui: entry.started_by_ui,
        },
        Some(expected_core_url),
    )
}

fn validate_watcher_entry_for_core(
    entry: &RuntimeFileWatcher,
    expected_core_url: Option<&str>,
) -> Option<RuntimeProcessRecord> {
    if entry.pid == 0 || entry.url.trim().is_empty() {
        return None;
    }

    let health_url = format!("{}/health", entry.url);
    let health = wait_for_health_service(&health_url, "rterm-watcher").ok()?;
    if health.pid != entry.pid {
        return None;
    }

    let state_url = format!("{}/watcher/state", entry.url);
    let state = request_watcher_state(&state_url).ok()?;
    if state.worker_id.as_deref() != entry.worker_id.as_deref() {
        return None;
    }
    if state.shutdown_token.as_deref() != entry.shutdown_token.as_deref() {
        return None;
    }

    if let Some(expected_core_url) = expected_core_url {
        if normalize_url_for_compare(&state.backend_url) != normalize_url_for_compare(expected_core_url) {
            return None;
        }
    }

    Some(RuntimeProcessRecord {
        pid: health.pid,
        url: entry.url.clone(),
        started_by_ui: entry.started_by_ui,
        auth_token: None,
        worker_id: entry.worker_id.clone(),
        shutdown_token: entry.shutdown_token.clone(),
    })
}

#[derive(Default)]
struct RuntimeAttachment {
    core: Option<RuntimeProcessRecord>,
    watcher: Option<RuntimeProcessRecord>,
}

fn write_runtime_file(core: &RuntimeProcess, watcher: Option<&RuntimeProcess>) -> Result<(), RuntimeError> {
    let Some(dir) = runtime_dir() else {
        return Err(RuntimeError::Path("missing home directory".into()));
    };
    fs::create_dir_all(&dir).map_err(|err| RuntimeError::Path(err.to_string()))?;

    let payload = RuntimeFile {
        core: Some(RuntimeFileCore {
            pid: core.pid,
            url: core.url.clone(),
            started_by_ui: core.started_by_ui,
            auth_token: core.auth_token.clone(),
        }),
        watcher: watcher.and_then(|process| {
            let pid = process.pid;
            if pid == 0 {
                None
            } else {
                Some(RuntimeFileWatcher {
                    pid,
                    url: process.url.clone(),
                    worker_id: process.worker_id.clone(),
                    shutdown_token: process.shutdown_token.clone(),
                    started_by_ui: process.started_by_ui,
                })
            }
        }),
    };

    let serialized = serde_json::to_string_pretty(&payload)
        .map_err(|err| RuntimeError::RuntimePayload(err.to_string()))?;
    fs::write(dir.join("runtime.json"), serialized).map_err(|err| RuntimeError::Path(err.to_string()))
}

fn clear_runtime_file() {
    if let Some(path) = runtime_file_path() {
        let _ = fs::remove_file(path);
    }
}

fn load_settings() -> SettingsFile {
    let Some(path) = settings_file_path() else {
        return SettingsFile::default();
    };

    read_json_file::<SettingsFile>(&path).unwrap_or_default()
}

fn normalize_url_for_compare(value: &str) -> String {
    let trimmed = value.trim();
    trimmed.trim_end_matches('/').to_string()
}

fn save_settings(settings: &SettingsFile) -> Result<(), RuntimeError> {
    let Some(dir) = runtime_dir() else {
        return Err(RuntimeError::Path("missing home directory".into()));
    };
    fs::create_dir_all(&dir).map_err(|err| RuntimeError::Path(err.to_string()))?;
    let payload = serde_json::to_string_pretty(settings)
        .map_err(|err| RuntimeError::RuntimePayload(err.to_string()))?;
    fs::write(dir.join("settings.json"), payload).map_err(|err| RuntimeError::Path(err.to_string()))
}

fn query_active_tasks(core_base_url: &str, auth_token: &str) -> Result<usize, RuntimeError> {
    let client = Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .map_err(|err: reqwest::Error| RuntimeError::Http(err.to_string()))?;

    let value: serde_json::Value = client
        .get(format!("{}/api/v1/tasks/active", core_base_url))
        .bearer_auth(auth_token)
        .send()
        .map_err(|err: reqwest::Error| RuntimeError::Http(err.to_string()))?
        .error_for_status()
        .map_err(|err: reqwest::Error| RuntimeError::Http(err.to_string()))?
        .json::<serde_json::Value>()
        .map_err(|err: reqwest::Error| RuntimeError::Http(err.to_string()))?;

    let count = value
        .get("count")
        .and_then(|v: &serde_json::Value| v.as_u64())
        .unwrap_or(0);
    Ok(count as usize)
}

fn stop_process(process: &mut RuntimeProcess) {
    if let Some(mut child) = process.child.take() {
        let _ = child.kill();
        let _ = child.wait();
        return;
    }

    if process.pid == 0 {
        return;
    }

    #[cfg(unix)]
    {
        let _ = Command::new("kill")
            .arg("-TERM")
            .arg(process.pid.to_string())
            .status();
    }

    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .arg("/PID")
            .arg(process.pid.to_string())
            .arg("/F")
            .status();
    }
}

fn wait_for_health_service(url: &str, service: &str) -> Result<HealthPayload, RuntimeError> {
    let payload = create_http_client()
        .get(url)
        .send()
        .map_err(|err: reqwest::Error| RuntimeError::Http(err.to_string()))?
        .error_for_status()
        .map_err(|err: reqwest::Error| RuntimeError::Http(err.to_string()))?
        .json::<HealthPayload>()
        .map_err(|err: reqwest::Error| RuntimeError::Http(err.to_string()))?;

    if payload.service != service || payload.status != "ok" || payload.pid == 0 {
        return Err(RuntimeError::Http(format!("invalid health response for {service}")));
    }
    Ok(payload)
}

fn wait_for_health_service_with_retry(url: &str, service: &str) -> Option<HealthPayload> {
    let deadline = Instant::now() + Duration::from_secs(10);
    while Instant::now() < deadline {
        if let Ok(payload) = wait_for_health_service(url, service) {
            return Some(payload);
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    None
}

fn wait_for_service_down(url: &str, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        let request = create_http_client().get(url).send();
        match request {
            Ok(response) => {
                if response.status().as_u16() >= 500 {
                    return true;
                }
            }
            Err(_) => return true,
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    false
}

fn wait_for_ready_file(path: &Path) -> Result<ReadyFilePayload, RuntimeError> {
    let deadline = Instant::now() + Duration::from_secs(10);
    let mut last_parse_error: Option<String> = None;
    while Instant::now() < deadline {
        if let Ok(raw) = fs::read_to_string(path) {
            if raw.trim().is_empty() {
                std::thread::sleep(Duration::from_millis(100));
                continue;
            }
            match serde_json::from_str(&raw) {
                Ok(payload) => return Ok(payload),
                Err(err) => {
                    last_parse_error = Some(err.to_string());
                }
            }
        }
        std::thread::sleep(Duration::from_millis(100));
    }

    let mut message = format!("timed out waiting for ready file {}", path.display());
    if let Some(err) = last_parse_error {
        message.push_str(": ");
        message.push_str(&err);
    }
    Err(RuntimeError::Ready(message))
}

fn read_json_file<T: serde::de::DeserializeOwned>(path: &Path) -> Option<T> {
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str::<T>(&raw).ok()
}

fn default_workspace_root() -> PathBuf {
    env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn runtime_dir() -> Option<PathBuf> {
    home_dir().map(|path| path.join(".rterm"))
}

fn runtime_file_path() -> Option<PathBuf> {
    runtime_dir().map(|dir| dir.join("runtime.json"))
}

fn settings_file_path() -> Option<PathBuf> {
    runtime_dir().map(|dir| dir.join("settings.json"))
}

fn home_dir() -> Option<PathBuf> {
    env::var_os("HOME")
        .map(PathBuf::from)
        .or_else(|| env::var_os("USERPROFILE").map(PathBuf::from))
}

fn core_binary_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(path) = env::var("RTERM_CORE_BIN") {
        candidates.push(PathBuf::from(path));
    }

    let root = default_workspace_root();
    candidates.push(root.join("apps/desktop/bin/rterm-core"));
    candidates.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../bin/rterm-core"));
    candidates.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../bin/rterm-core"));
    candidates
}

fn random_token() -> String {
    random_token_n(40)
}

fn random_token_n(length: usize) -> String {
    Alphanumeric.sample_string(&mut rand::rng(), length)
}

fn create_http_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .unwrap_or_else(|_| Client::new())
}

fn request_watcher_state(url: &str) -> Result<WatcherStatePayload, RuntimeError> {
    let payload = create_http_client()
        .get(url)
        .send()
        .map_err(|err: reqwest::Error| RuntimeError::Http(err.to_string()))?
        .error_for_status()
        .map_err(|err: reqwest::Error| RuntimeError::Http(err.to_string()))?
        .json::<WatcherStatePayload>()
        .map_err(|err: reqwest::Error| RuntimeError::Http(err.to_string()))?;

    if payload.backend_url.trim().is_empty() {
        return Err(RuntimeError::Http("watcher state missing backend_url".into()));
    }

    Ok(payload)
}

#[cfg(test)]
mod tests {
    use super::{
        cleanup_runtime_slot, recover_or_drop_watcher_record, wait_for_ready_file, ReadyFilePayload,
        RuntimeError, RuntimeProcess, RuntimeProcessRecord, RuntimeRuntime, SettingsFile, WatcherMode,
    };
    use std::fs;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn wait_for_ready_file_retries_until_payload_is_complete() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let ready_path = temp_dir.path().join("runtime-ready.json");

        fs::write(&ready_path, "{").expect("write partial payload");
        let ready_path_clone = ready_path.clone();
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(150));
            fs::write(
                &ready_path_clone,
                r#"{"base_url":"http://127.0.0.1:40123","pid":4242}"#,
            )
            .expect("write complete payload");
        });

        let payload = wait_for_ready_file(&ready_path).expect("payload should be readable");
        assert_eq!(
            payload,
            ReadyFilePayload {
                base_url: "http://127.0.0.1:40123".into(),
                pid: 4242,
            }
        );
    }

    #[test]
    fn recover_or_drop_watcher_record_reuses_valid_record_without_cleanup() {
        let record = RuntimeProcessRecord {
            pid: 4242,
            url: "http://127.0.0.1:7788".into(),
            started_by_ui: true,
            auth_token: None,
            worker_id: Some("watcher_valid".into()),
            shutdown_token: Some("token".into()),
        };

        let mut cleanup_called = false;
        let resolved = recover_or_drop_watcher_record(
            Some(record.clone()),
            "http://127.0.0.1:5000",
            |candidate, _| Some(candidate.clone()),
            |_| {
                cleanup_called = true;
                Ok(())
            },
        )
        .expect("valid watcher should be reused");

        assert_eq!(resolved.expect("record").pid, 4242);
        assert!(!cleanup_called, "cleanup must not run for valid watcher");
    }

    #[test]
    fn recover_or_drop_watcher_record_cleans_invalid_record_before_respawn() {
        let record = RuntimeProcessRecord {
            pid: 4242,
            url: "http://127.0.0.1:7788".into(),
            started_by_ui: true,
            auth_token: None,
            worker_id: Some("watcher_stale".into()),
            shutdown_token: Some("token".into()),
        };

        let mut cleanup_called = false;
        let resolved = recover_or_drop_watcher_record(
            Some(record),
            "http://127.0.0.1:6000",
            |_, _| None,
            |_| {
                cleanup_called = true;
                Ok(())
            },
        )
        .expect("stale watcher should be dropped after cleanup");

        assert!(resolved.is_none(), "stale watcher must be dropped");
        assert!(cleanup_called, "cleanup must run for invalid watcher");
    }

    #[test]
    fn recover_or_drop_watcher_record_surfaces_cleanup_failure() {
        let record = RuntimeProcessRecord {
            pid: 4242,
            url: "http://127.0.0.1:7788".into(),
            started_by_ui: true,
            auth_token: None,
            worker_id: Some("watcher_stale".into()),
            shutdown_token: Some("token".into()),
        };

        let err = recover_or_drop_watcher_record(
            Some(record),
            "http://127.0.0.1:6000",
            |_, _| None,
            |_| Err(RuntimeError::Http("cleanup failed".into())),
        )
        .expect_err("cleanup failure should stop startup");

        assert!(matches!(err, RuntimeError::Http(message) if message == "cleanup failed"));
    }

    #[test]
    fn cleanup_runtime_slot_shuts_down_ephemeral_runtime_and_clears_runtime_file() {
        let mut clear_called = false;
        let mut slot = Some(RuntimeRuntime {
            core: RuntimeProcess {
                child: None,
                pid: 4242,
                url: "http://127.0.0.1:40100".into(),
                started_by_ui: false,
                auth_token: Some("token".into()),
                worker_id: None,
                shutdown_token: None,
            },
            watcher: Some(RuntimeProcess {
                child: None,
                pid: 4243,
                url: "http://127.0.0.1:7788".into(),
                started_by_ui: false,
                auth_token: None,
                worker_id: Some("watcher".into()),
                shutdown_token: Some("shutdown".into()),
            }),
            settings: SettingsFile {
                watcher_mode: WatcherMode::Ephemeral,
                core_auth_token: Some("token".into()),
            },
        });

        cleanup_runtime_slot(&mut slot, || {
            clear_called = true;
        });

        assert!(slot.is_none(), "runtime slot should be cleared after cleanup");
        assert!(clear_called, "ephemeral cleanup should clear runtime file");
    }

    #[test]
    fn cleanup_runtime_slot_preserves_runtime_file_for_persistent_runtime() {
        let mut clear_called = false;
        let mut slot = Some(RuntimeRuntime {
            core: RuntimeProcess {
                child: None,
                pid: 4242,
                url: "http://127.0.0.1:40100".into(),
                started_by_ui: false,
                auth_token: Some("token".into()),
                worker_id: None,
                shutdown_token: None,
            },
            watcher: None,
            settings: SettingsFile {
                watcher_mode: WatcherMode::Persistent,
                core_auth_token: Some("token".into()),
            },
        });

        cleanup_runtime_slot(&mut slot, || {
            clear_called = true;
        });

        assert!(slot.is_none(), "runtime slot should still be cleared after cleanup");
        assert!(!clear_called, "persistent cleanup should preserve runtime file");
    }
}
