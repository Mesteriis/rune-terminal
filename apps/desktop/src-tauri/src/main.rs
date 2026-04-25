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
use tauri::{AppHandle, Emitter, Manager, State};
use thiserror::Error;

const MAIN_WINDOW_LABEL: &str = "main";
const SINGLE_INSTANCE_EVENT: &str = "rterm://single-instance";

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

#[derive(Debug, Clone, Serialize)]
struct SingleInstancePayload {
    args: Vec<String>,
    cwd: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
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
    request_shutdown_runtime(
        &mut guard,
        force,
        query_active_tasks,
        shutdown_runtime,
        clear_runtime_file,
    )
    .map_err(|err| err.to_string())
}

fn request_shutdown_runtime<FQuery, FShutdown, FClear>(
    slot: &mut Option<RuntimeRuntime>,
    force: bool,
    mut query_active_tasks_fn: FQuery,
    mut shutdown_runtime_fn: FShutdown,
    mut clear_runtime_file_fn: FClear,
) -> Result<RuntimeShutdownResult, RuntimeError>
where
    FQuery: FnMut(&str, &str) -> Result<usize, RuntimeError>,
    FShutdown: FnMut(&mut RuntimeRuntime) -> Result<(), RuntimeError>,
    FClear: FnMut(),
{
    let Some(runtime) = slot.as_mut() else {
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
        .ok_or_else(|| RuntimeError::Http("core auth token is not available".into()))?;
    let active_tasks = query_active_tasks_fn(&runtime.core.url, &auth_token)?;
    if !force && active_tasks > 0 {
        return Ok(RuntimeShutdownResult {
            can_close: false,
            active_tasks,
            watcher_mode: watcher_mode.to_string(),
        });
    }

    shutdown_runtime_fn(runtime)?;
    clear_runtime_file_fn();
    let watcher_mode = watcher_mode.to_string();
    *slot = None;

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
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            handle_second_instance(app, argv, cwd);
        }))
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

fn handle_second_instance<R: tauri::Runtime>(app: &AppHandle<R>, argv: Vec<String>, cwd: String) {
    focus_main_window(app);

    let _ = app.emit(
        SINGLE_INSTANCE_EVENT,
        SingleInstancePayload { args: argv, cwd },
    );
}

fn focus_main_window<R: tauri::Runtime>(app: &AppHandle<R>) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };

    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
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

    let watcher_record = watcher_record.or_else(|| recover_running_watcher_for_core(&core.url));

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
        if let Err(err) = ensure_no_foreign_watcher_listener(&core.url) {
            if spawned_core_for_this_launch {
                stop_process(&mut core);
            }
            return Err(err);
        }
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

fn recover_running_watcher_for_core(expected_core_url: &str) -> Option<RuntimeProcessRecord> {
    discover_running_watcher_for_core(
        &format!("http://{}", WATCHER_LISTEN_ADDR),
        expected_core_url,
        wait_for_health_service,
        request_watcher_state,
    )
}

fn ensure_no_foreign_watcher_listener(expected_core_url: &str) -> Result<(), RuntimeError> {
    reject_foreign_watcher_listener(
        &format!("http://{}", WATCHER_LISTEN_ADDR),
        expected_core_url,
        wait_for_health_service,
        request_watcher_state,
    )
}

fn reject_foreign_watcher_listener<FHealth, FState>(
    watcher_base_url: &str,
    expected_core_url: &str,
    mut health_lookup: FHealth,
    mut state_lookup: FState,
) -> Result<(), RuntimeError>
where
    FHealth: FnMut(&str, &str) -> Result<HealthPayload, RuntimeError>,
    FState: FnMut(&str) -> Result<WatcherStatePayload, RuntimeError>,
{
    let health_url = format!("{}/health", watcher_base_url);
    let health = match health_lookup(&health_url, "rterm-watcher") {
        Ok(payload) => payload,
        Err(_) => return Ok(()),
    };

    let state_url = format!("{}/watcher/state", watcher_base_url);
    let state = match state_lookup(&state_url) {
        Ok(payload) => payload,
        Err(_) => return Ok(()),
    };

    if normalize_url_for_compare(&state.backend_url) == normalize_url_for_compare(expected_core_url) {
        return Ok(());
    }

    Err(RuntimeError::Http(format!(
        "watcher listen address {} is already occupied by watcher pid {} for backend {}",
        WATCHER_LISTEN_ADDR, health.pid, state.backend_url
    )))
}

fn discover_running_watcher_for_core<FHealth, FState>(
    watcher_base_url: &str,
    expected_core_url: &str,
    mut health_lookup: FHealth,
    mut state_lookup: FState,
) -> Option<RuntimeProcessRecord>
where
    FHealth: FnMut(&str, &str) -> Result<HealthPayload, RuntimeError>,
    FState: FnMut(&str) -> Result<WatcherStatePayload, RuntimeError>,
{
    let health_url = format!("{}/health", watcher_base_url);
    let health = health_lookup(&health_url, "rterm-watcher").ok()?;

    let state_url = format!("{}/watcher/state", watcher_base_url);
    let state = state_lookup(&state_url).ok()?;
    if normalize_url_for_compare(&state.backend_url) != normalize_url_for_compare(expected_core_url) {
        return None;
    }

    let worker_id = state.worker_id?;
    let shutdown_token = state.shutdown_token?;
    Some(RuntimeProcessRecord {
        pid: health.pid,
        url: watcher_base_url.to_string(),
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
    read_runtime_attachment_from_path(&path, validate_core_entry, validate_watcher_entry_for_core)
}

fn read_runtime_attachment_from_path<ValidateCore, ValidateWatcher>(
    path: &Path,
    validate_core: ValidateCore,
    validate_watcher: ValidateWatcher,
) -> RuntimeAttachment
where
    ValidateCore: Fn(RuntimeFileCore) -> Option<RuntimeProcessRecord>,
    ValidateWatcher: Fn(&RuntimeFileWatcher, Option<&str>) -> Option<RuntimeProcessRecord>,
{
    let raw = match fs::read_to_string(path) {
        Ok(raw) => raw,
        Err(_) => return RuntimeAttachment::default(),
    };
    let file = match serde_json::from_str::<RuntimeFile>(&raw) {
        Ok(file) => file,
        Err(_) => {
            quarantine_invalid_metadata_file_at_path(path);
            return RuntimeAttachment::default();
        }
    };

    let (attachment, should_clear) = sanitize_runtime_attachment(file, validate_core, validate_watcher);
    if should_clear {
        clear_runtime_file_at_path(path);
    }
    attachment
}

fn sanitize_runtime_attachment<ValidateCore, ValidateWatcher>(
    file: RuntimeFile,
    validate_core: ValidateCore,
    validate_watcher: ValidateWatcher,
) -> (RuntimeAttachment, bool)
where
    ValidateCore: Fn(RuntimeFileCore) -> Option<RuntimeProcessRecord>,
    ValidateWatcher: Fn(&RuntimeFileWatcher, Option<&str>) -> Option<RuntimeProcessRecord>,
{
    let had_core = file.core.is_some();
    let had_watcher = file.watcher.is_some();

    let core = file.core.and_then(validate_core);
    let watcher = if let Some(core) = core.as_ref() {
        file.watcher
            .as_ref()
            .and_then(|watcher| validate_watcher(watcher, Some(&core.url)))
    } else {
        file.watcher
            .as_ref()
            .and_then(|watcher| validate_watcher(watcher, None))
    };

    let should_clear = (had_core && core.is_none()) || (had_watcher && watcher.is_none());
    (RuntimeAttachment { core, watcher }, should_clear)
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
    let Some(path) = runtime_file_path() else {
        return Err(RuntimeError::Path("missing home directory".into()));
    };

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
    write_file_atomically(&path, &serialized)
}

fn clear_runtime_file() {
    if let Some(path) = runtime_file_path() {
        clear_runtime_file_at_path(&path);
    }
}

fn clear_runtime_file_at_path(path: &Path) {
    let _ = fs::remove_file(path);
}

fn quarantine_invalid_metadata_file_at_path(path: &Path) {
    if !path.exists() {
        return;
    }

    let Some(parent) = path.parent() else {
        let _ = fs::remove_file(path);
        return;
    };

    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("metadata");
    let extension = path.extension().and_then(|value| value.to_str()).unwrap_or("json");
    let quarantined_path = parent.join(format!(
        "{}.invalid-{}.{}",
        stem,
        random_token_n(8),
        extension
    ));

    if fs::rename(path, &quarantined_path).is_err() {
        let _ = fs::remove_file(path);
    }
}

fn load_settings() -> SettingsFile {
    let Some(path) = settings_file_path() else {
        return SettingsFile::default();
    };

    load_settings_from_path(&path)
}

fn load_settings_from_path(path: &Path) -> SettingsFile {
    let raw = match fs::read_to_string(path) {
        Ok(raw) => raw,
        Err(_) => return SettingsFile::default(),
    };

    match serde_json::from_str::<SettingsFile>(&raw) {
        Ok(settings) => settings,
        Err(_) => {
            quarantine_invalid_metadata_file_at_path(path);
            SettingsFile::default()
        }
    }
}

fn normalize_url_for_compare(value: &str) -> String {
    let trimmed = value.trim();
    trimmed.trim_end_matches('/').to_string()
}

fn save_settings(settings: &SettingsFile) -> Result<(), RuntimeError> {
    let Some(path) = settings_file_path() else {
        return Err(RuntimeError::Path("missing home directory".into()));
    };
    let payload = serde_json::to_string_pretty(settings)
        .map_err(|err| RuntimeError::RuntimePayload(err.to_string()))?;
    write_file_atomically(&path, &payload)
}

fn write_file_atomically(path: &Path, contents: &str) -> Result<(), RuntimeError> {
    let Some(parent) = path.parent() else {
        return Err(RuntimeError::Path(format!(
            "missing parent directory for {}",
            path.display()
        )));
    };
    fs::create_dir_all(parent).map_err(|err| RuntimeError::Path(err.to_string()))?;

    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("runtime-file");
    let temp_path = parent.join(format!(".{}.tmp-{}", file_name, random_token_n(8)));

    fs::write(&temp_path, contents).map_err(|err| RuntimeError::Path(err.to_string()))?;
    match fs::rename(&temp_path, path) {
        Ok(()) => Ok(()),
        Err(err) => {
            let _ = fs::remove_file(&temp_path);
            Err(RuntimeError::Path(err.to_string()))
        }
    }
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
        cleanup_runtime_slot, discover_running_watcher_for_core,
        load_settings_from_path,
        read_runtime_attachment_from_path, recover_or_drop_watcher_record,
        request_shutdown_runtime,
        reject_foreign_watcher_listener, sanitize_runtime_attachment, wait_for_ready_file,
        write_file_atomically, HealthPayload, ReadyFilePayload, RuntimeError, RuntimeFile,
        RuntimeFileCore, RuntimeFileWatcher, RuntimeProcess, RuntimeProcessRecord,
        RuntimeRuntime, SettingsFile, SingleInstancePayload, WatcherMode, WatcherStatePayload,
        SINGLE_INSTANCE_EVENT,
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
    fn write_file_atomically_replaces_existing_payload() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let path = temp_dir.path().join("runtime.json");
        fs::write(&path, r#"{"base_url":"http://127.0.0.1:1","pid":1}"#).expect("seed payload");

        write_file_atomically(&path, r#"{"base_url":"http://127.0.0.1:2","pid":2}"#)
            .expect("atomic write should replace payload");

        assert_eq!(
            fs::read_to_string(&path).expect("read payload"),
            r#"{"base_url":"http://127.0.0.1:2","pid":2}"#
        );
    }

    #[test]
    fn write_file_atomically_creates_missing_parent_directory() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let path = temp_dir.path().join("nested").join("settings.json");

        write_file_atomically(&path, r#"{"watcher_mode":"ephemeral"}"#)
            .expect("atomic write should create parent directory");

        assert_eq!(
            fs::read_to_string(&path).expect("read payload"),
            r#"{"watcher_mode":"ephemeral"}"#
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
    fn discover_running_watcher_for_core_reuses_matching_listener_without_runtime_file() {
        let record = discover_running_watcher_for_core(
            "http://127.0.0.1:7788",
            "http://127.0.0.1:40100",
            |url, service| {
                assert_eq!(url, "http://127.0.0.1:7788/health");
                assert_eq!(service, "rterm-watcher");
                Ok(HealthPayload {
                    service: "rterm-watcher".into(),
                    status: "ok".into(),
                    pid: 4243,
                })
            },
            |url| {
                assert_eq!(url, "http://127.0.0.1:7788/watcher/state");
                Ok(WatcherStatePayload {
                    backend_url: "http://127.0.0.1:40100".into(),
                    worker_id: Some("watcher_live".into()),
                    shutdown_token: Some("shutdown".into()),
                })
            },
        )
        .expect("matching live watcher should be reused");

        assert_eq!(record.pid, 4243);
        assert_eq!(record.url, "http://127.0.0.1:7788");
        assert!(record.started_by_ui);
        assert_eq!(record.worker_id.as_deref(), Some("watcher_live"));
        assert_eq!(record.shutdown_token.as_deref(), Some("shutdown"));
    }

    #[test]
    fn discover_running_watcher_for_core_rejects_mismatched_backend() {
        let record = discover_running_watcher_for_core(
            "http://127.0.0.1:7788",
            "http://127.0.0.1:40100",
            |_url, _service| {
                Ok(HealthPayload {
                    service: "rterm-watcher".into(),
                    status: "ok".into(),
                    pid: 4243,
                })
            },
            |_url| {
                Ok(WatcherStatePayload {
                    backend_url: "http://127.0.0.1:49999".into(),
                    worker_id: Some("watcher_other".into()),
                    shutdown_token: Some("shutdown".into()),
                })
            },
        );

        assert!(record.is_none(), "foreign watcher listener must not be adopted");
    }

    #[test]
    fn reject_foreign_watcher_listener_surfaces_port_conflict_for_other_backend() {
        let err = reject_foreign_watcher_listener(
            "http://127.0.0.1:7788",
            "http://127.0.0.1:40100",
            |_url, _service| {
                Ok(HealthPayload {
                    service: "rterm-watcher".into(),
                    status: "ok".into(),
                    pid: 4243,
                })
            },
            |_url| {
                Ok(WatcherStatePayload {
                    backend_url: "http://127.0.0.1:49999".into(),
                    worker_id: Some("watcher_other".into()),
                    shutdown_token: Some("shutdown".into()),
                })
            },
        )
        .expect_err("foreign watcher listener should block startup");

        assert!(
            matches!(err, RuntimeError::Http(ref message) if message.contains("127.0.0.1:7788") && message.contains("http://127.0.0.1:49999")),
            "unexpected error: {err}"
        );
    }

    #[test]
    fn reject_foreign_watcher_listener_ignores_empty_port() {
        let result = reject_foreign_watcher_listener(
            "http://127.0.0.1:7788",
            "http://127.0.0.1:40100",
            |_url, _service| Err(RuntimeError::Http("connection refused".into())),
            |_url| unreachable!("state lookup should not run when health fails"),
        );

        assert!(result.is_ok(), "empty port should not block watcher spawn");
    }

    #[test]
    fn sanitize_runtime_attachment_marks_invalid_core_record_for_clear() {
        let (attachment, should_clear) = sanitize_runtime_attachment(
            RuntimeFile {
                core: Some(RuntimeFileCore {
                    pid: 41,
                    url: "http://127.0.0.1:40100".into(),
                    started_by_ui: true,
                    auth_token: Some("token".into()),
                }),
                watcher: None,
            },
            |_| None,
            |_watcher, _expected_core| None,
        );

        assert!(attachment.core.is_none());
        assert!(attachment.watcher.is_none());
        assert!(should_clear, "invalid core metadata must be cleared from disk");
    }

    #[test]
    fn sanitize_runtime_attachment_marks_invalid_watcher_record_for_clear() {
        let (attachment, should_clear) = sanitize_runtime_attachment(
            RuntimeFile {
                core: Some(RuntimeFileCore {
                    pid: 41,
                    url: "http://127.0.0.1:40100".into(),
                    started_by_ui: true,
                    auth_token: Some("token".into()),
                }),
                watcher: Some(RuntimeFileWatcher {
                    pid: 42,
                    url: "http://127.0.0.1:7788".into(),
                    worker_id: Some("watcher".into()),
                    shutdown_token: Some("shutdown".into()),
                    started_by_ui: true,
                }),
            },
            |core| {
                Some(RuntimeProcessRecord {
                    pid: core.pid,
                    url: core.url,
                    started_by_ui: core.started_by_ui,
                    auth_token: core.auth_token,
                    worker_id: None,
                    shutdown_token: None,
                })
            },
            |_watcher, _expected_core| None,
        );

        assert!(attachment.core.is_some());
        assert!(attachment.watcher.is_none());
        assert!(should_clear, "invalid watcher metadata must be cleared from disk");
    }

    #[test]
    fn read_runtime_attachment_from_path_quarantines_malformed_runtime_file() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let runtime_path = temp_dir.path().join("runtime.json");
        fs::write(&runtime_path, "{").expect("write malformed runtime file");

        let attachment =
            read_runtime_attachment_from_path(&runtime_path, |_core| None, |_watcher, _expected| None);

        assert!(attachment.core.is_none());
        assert!(attachment.watcher.is_none());
        assert!(!runtime_path.exists(), "malformed runtime.json should be removed from the active path");

        let quarantined = fs::read_dir(temp_dir.path())
            .expect("read temp dir")
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .find(|path| {
                path.file_name()
                    .and_then(|value| value.to_str())
                    .is_some_and(|name| name.starts_with("runtime.invalid-") && name.ends_with(".json"))
            })
            .expect("malformed runtime metadata should be quarantined");
        assert_eq!(
            fs::read_to_string(quarantined).expect("read quarantined runtime file"),
            "{"
        );
    }

    #[test]
    fn read_runtime_attachment_from_path_clears_dead_attachment_records() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let runtime_path = temp_dir.path().join("runtime.json");
        fs::write(
            &runtime_path,
            r#"{
  "core": {
    "pid": 41,
    "url": "http://127.0.0.1:40100",
    "started_by_ui": true,
    "auth_token": "token"
  },
  "watcher": {
    "pid": 42,
    "url": "http://127.0.0.1:7788",
    "worker_id": "watcher",
    "shutdown_token": "shutdown",
    "started_by_ui": true
  }
}"#,
        )
        .expect("write runtime file");

        let attachment =
            read_runtime_attachment_from_path(&runtime_path, |_core| None, |_watcher, _expected| None);

        assert!(attachment.core.is_none());
        assert!(attachment.watcher.is_none());
        assert!(
            !runtime_path.exists(),
            "dead runtime attachment records should be deleted during startup recovery"
        );
    }

    #[test]
    fn load_settings_from_path_quarantines_malformed_settings_file() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let settings_path = temp_dir.path().join("settings.json");
        fs::write(&settings_path, "{").expect("write malformed settings file");

        let settings = load_settings_from_path(&settings_path);

        assert_eq!(settings.watcher_mode, WatcherMode::Ephemeral);
        assert_eq!(settings.core_auth_token, None);
        assert!(!settings_path.exists(), "malformed settings.json should be removed from the active path");

        let quarantined = fs::read_dir(temp_dir.path())
            .expect("read temp dir")
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .find(|path| {
                path.file_name()
                    .and_then(|value| value.to_str())
                    .is_some_and(|name| name.starts_with("settings.invalid-") && name.ends_with(".json"))
            })
            .expect("malformed settings metadata should be quarantined");
        assert_eq!(
            fs::read_to_string(quarantined).expect("read quarantined settings file"),
            "{"
        );
    }

    #[test]
    fn load_settings_from_path_keeps_valid_settings_file() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let settings_path = temp_dir.path().join("settings.json");
        fs::write(
            &settings_path,
            r#"{"watcher_mode":"persistent","core_auth_token":"token"}"#,
        )
        .expect("write valid settings file");

        let settings = load_settings_from_path(&settings_path);

        assert_eq!(settings.watcher_mode, WatcherMode::Persistent);
        assert_eq!(settings.core_auth_token.as_deref(), Some("token"));
        assert!(
            settings_path.exists(),
            "valid settings.json should be preserved during startup recovery"
        );
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

    #[test]
    fn request_shutdown_runtime_allows_close_when_runtime_is_missing() {
        let mut slot = None;
        let result = request_shutdown_runtime(
            &mut slot,
            false,
            |_url, _token| unreachable!("no runtime should skip task lookup"),
            |_runtime| unreachable!("no runtime should skip shutdown"),
            || unreachable!("no runtime should skip runtime-file cleanup"),
        )
        .expect("missing runtime should still allow close");

        assert!(result.can_close);
        assert_eq!(result.active_tasks, 0);
        assert_eq!(result.watcher_mode, "ephemeral");
        assert!(slot.is_none());
    }

    #[test]
    fn request_shutdown_runtime_bypasses_task_lookup_for_persistent_mode() {
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

        let result = request_shutdown_runtime(
            &mut slot,
            false,
            |_url, _token| unreachable!("persistent mode should not query active tasks"),
            |_runtime| unreachable!("persistent mode should not shut runtime down"),
            || unreachable!("persistent mode should not clear runtime file"),
        )
        .expect("persistent mode should allow close immediately");

        assert!(result.can_close);
        assert_eq!(result.active_tasks, 0);
        assert_eq!(result.watcher_mode, "persistent");
        assert!(slot.is_some(), "persistent mode should preserve the runtime slot");
    }

    #[test]
    fn request_shutdown_runtime_blocks_ephemeral_close_when_active_tasks_exist() {
        let mut clear_called = false;
        let mut shutdown_called = false;
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
                watcher_mode: WatcherMode::Ephemeral,
                core_auth_token: Some("token".into()),
            },
        });

        let result = request_shutdown_runtime(
            &mut slot,
            false,
            |url, token| {
                assert_eq!(url, "http://127.0.0.1:40100");
                assert_eq!(token, "token");
                Ok(3)
            },
            |_runtime| {
                shutdown_called = true;
                Ok(())
            },
            || {
                clear_called = true;
            },
        )
        .expect("active tasks should return a non-closing result");

        assert!(!result.can_close);
        assert_eq!(result.active_tasks, 3);
        assert_eq!(result.watcher_mode, "ephemeral");
        assert!(slot.is_some(), "active tasks should keep runtime attached");
        assert!(!shutdown_called, "blocked close must not shut runtime down");
        assert!(!clear_called, "blocked close must not clear runtime metadata");
    }

    #[test]
    fn request_shutdown_runtime_forces_ephemeral_shutdown_when_requested() {
        let mut clear_called = false;
        let mut shutdown_called = false;
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
                watcher_mode: WatcherMode::Ephemeral,
                core_auth_token: Some("token".into()),
            },
        });

        let result = request_shutdown_runtime(
            &mut slot,
            true,
            |_url, _token| Ok(2),
            |_runtime| {
                shutdown_called = true;
                Ok(())
            },
            || {
                clear_called = true;
            },
        )
        .expect("forced close should shut runtime down");

        assert!(result.can_close);
        assert_eq!(result.active_tasks, 2);
        assert_eq!(result.watcher_mode, "ephemeral");
        assert!(slot.is_none(), "forced shutdown should clear the runtime slot");
        assert!(shutdown_called, "forced close must shut runtime down");
        assert!(clear_called, "forced close must clear runtime metadata");
    }

    #[test]
    fn request_shutdown_runtime_requires_core_auth_token_for_ephemeral_mode() {
        let mut slot = Some(RuntimeRuntime {
            core: RuntimeProcess {
                child: None,
                pid: 4242,
                url: "http://127.0.0.1:40100".into(),
                started_by_ui: false,
                auth_token: None,
                worker_id: None,
                shutdown_token: None,
            },
            watcher: None,
            settings: SettingsFile {
                watcher_mode: WatcherMode::Ephemeral,
                core_auth_token: None,
            },
        });

        let err = request_shutdown_runtime(
            &mut slot,
            false,
            |_url, _token| unreachable!("missing token should fail before task lookup"),
            |_runtime| unreachable!("missing token should fail before shutdown"),
            || unreachable!("missing token should fail before cleanup"),
        )
        .expect_err("ephemeral shutdown requires a core auth token");

        assert!(
            matches!(err, RuntimeError::Http(message) if message == "core auth token is not available")
        );
        assert!(slot.is_some(), "failure should preserve runtime slot for recovery");
    }

    #[test]
    fn single_instance_payload_serializes_args_and_cwd() {
        let payload = SingleInstancePayload {
            args: vec!["/Applications/RunaTerminal.app".into(), "--workspace".into()],
            cwd: "/tmp/rterm".into(),
        };

        let value = serde_json::to_value(&payload).expect("payload should serialize");
        assert_eq!(value["args"][0], "/Applications/RunaTerminal.app");
        assert_eq!(value["args"][1], "--workspace");
        assert_eq!(value["cwd"], "/tmp/rterm");
        assert_eq!(SINGLE_INSTANCE_EVENT, "rterm://single-instance");
    }
}
