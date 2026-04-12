use rand::distr::{Alphanumeric, SampleString};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{Manager, State};
use thiserror::Error;

#[derive(Default)]
struct RuntimeState {
    inner: Mutex<Option<CoreRuntime>>,
}

struct CoreRuntime {
    child: Child,
    base_url: String,
    auth_token: String,
}

#[derive(Debug, Serialize)]
struct RuntimeInfo {
    base_url: String,
    auth_token: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct ReadyFilePayload {
    base_url: String,
    pid: u32,
}

#[derive(Debug, Error)]
enum RuntimeError {
    #[error("core binary not found; run `npm run build:core` first")]
    BinaryNotFound,
    #[error("unable to create state directory: {0}")]
    StateDir(String),
    #[error("failed to spawn Go core: {0}")]
    Spawn(String),
    #[error("failed to read ready payload: {0}")]
    Ready(String),
}

#[tauri::command]
fn runtime_info(state: State<'_, RuntimeState>) -> Result<RuntimeInfo, String> {
    let guard = state.inner.lock().map_err(|err| err.to_string())?;
    let runtime = guard
        .as_ref()
        .ok_or_else(|| "Go core runtime is not available".to_string())?;
    Ok(RuntimeInfo {
        base_url: runtime.base_url.clone(),
        auth_token: runtime.auth_token.clone(),
    })
}

fn default_workspace_root() -> PathBuf {
    env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn core_binary_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(path) = env::var("RTERM_CORE_BIN") {
        candidates.push(PathBuf::from(path));
    }

    let current = default_workspace_root();
    candidates.push(current.join("apps/desktop/bin/rterm-core"));
    candidates.push(Path::new(env!("CARGO_MANIFEST_DIR")).join("../bin/rterm-core"));
    candidates.push(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../bin/rterm-core"));
    candidates
}

fn wait_for_ready_file(path: &Path) -> Result<ReadyFilePayload, RuntimeError> {
    let deadline = Instant::now() + Duration::from_secs(10);
    while Instant::now() < deadline {
        if let Ok(raw) = fs::read_to_string(path) {
            return serde_json::from_str::<ReadyFilePayload>(&raw)
                .map_err(|err| RuntimeError::Ready(err.to_string()));
        }
        thread::sleep(Duration::from_millis(100));
    }
    Err(RuntimeError::Ready(format!(
        "timed out waiting for ready file {}",
        path.display()
    )))
}

fn start_core(app: &tauri::AppHandle, state: &RuntimeState) -> Result<(), RuntimeError> {
    let mut guard = state
        .inner
        .lock()
        .map_err(|err| RuntimeError::Spawn(err.to_string()))?;
    if guard.is_some() {
        return Ok(());
    }

    let binary = core_binary_candidates()
        .into_iter()
        .find(|path| path.exists())
        .ok_or(RuntimeError::BinaryNotFound)?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| RuntimeError::StateDir(err.to_string()))?;
    fs::create_dir_all(&app_data_dir).map_err(|err| RuntimeError::StateDir(err.to_string()))?;

    let state_dir = app_data_dir.join("core");
    fs::create_dir_all(&state_dir).map_err(|err| RuntimeError::StateDir(err.to_string()))?;

    let mut rng = rand::rng();
    let auth_token = Alphanumeric.sample_string(&mut rng, 40);
    let ready_file = state_dir.join("runtime-ready.json");
    let _ = fs::remove_file(&ready_file);

    let child = Command::new(binary)
        .arg("serve")
        .arg("--listen")
        .arg("127.0.0.1:0")
        .arg("--workspace-root")
        .arg(default_workspace_root())
        .arg("--state-dir")
        .arg(&state_dir)
        .arg("--ready-file")
        .arg(&ready_file)
        .env("RTERM_AUTH_TOKEN", &auth_token)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|err| RuntimeError::Spawn(err.to_string()))?;

    let ready = wait_for_ready_file(&ready_file)?;
    *guard = Some(CoreRuntime {
        child,
        base_url: ready.base_url,
        auth_token,
    });
    Ok(())
}

fn stop_core(state: &RuntimeState) {
    if let Ok(mut guard) = state.inner.lock() {
        if let Some(runtime) = guard.as_mut() {
            let _ = runtime.child.kill();
            let _ = runtime.child.wait();
        }
        *guard = None;
    }
}

fn main() {
    let runtime_state = RuntimeState::default();

    tauri::Builder::default()
        .manage(runtime_state)
        .setup(|app| {
            let state = app.state::<RuntimeState>();
            start_core(app.handle(), &state)
                .map_err(|err| tauri::Error::Anyhow(anyhow::anyhow!(err.to_string())))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![runtime_info])
        .build(tauri::generate_context!())
        .expect("failed to build Tauri app")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                let state = app.state::<RuntimeState>();
                stop_core(&state);
            }
        });
}
