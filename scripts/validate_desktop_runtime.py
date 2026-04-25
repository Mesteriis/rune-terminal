#!/usr/bin/env python3
"""Validation for desktop runtime startup/shutdown lifecycle."""

from __future__ import annotations

import atexit
import json
import os
import shutil
import signal
import socket
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[1]
WATCHER_PORT = 7788
ORIGINAL_HOME = Path.home()
DESKTOP_SHUTDOWN_TIMEOUT_SECONDS = 20.0


@dataclass(frozen=True)
class ProcessInfo:
    pid: int
    ppid: int
    command: str


def list_processes() -> list[ProcessInfo]:
    raw = subprocess.check_output(  # noqa: S603
        ["ps", "-axo", "pid=,ppid=,command="],
        text=True,
        cwd=str(REPO_ROOT),
    )
    processes: list[ProcessInfo] = []
    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        pid_text, _, remainder = stripped.partition(" ")
        ppid_text, _, command = remainder.strip().partition(" ")
        if not pid_text.isdigit() or not ppid_text.isdigit() or not command:
            continue
        processes.append(
            ProcessInfo(
                pid=int(pid_text),
                ppid=int(ppid_text),
                command=command.strip(),
            )
        )
    return processes


def find_desktop_processes() -> list[ProcessInfo]:
    return [
        process
        for process in list_processes()
        if "rterm-desktop" in process.command and str(REPO_ROOT) in process.command
    ]


def process_exists(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def wait_for_process_exit(pid: int, timeout_seconds: float) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if not process_exists(pid):
            return True
        time.sleep(0.2)
    return not process_exists(pid)


def is_port_listening(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((host, port)) == 0


def request_json(url: str, *, timeout: float = 2.0) -> Any:
    req = Request(url, method="GET")
    with urlopen(req, timeout=timeout) as response:  # noqa: S310
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def wait_for_json_file(path: Path, timeout_seconds: float) -> dict[str, Any]:
    deadline = time.time() + timeout_seconds
    last_error: str | None = None
    while time.time() < deadline:
        try:
            raw = path.read_text(encoding="utf-8")
        except FileNotFoundError:
            time.sleep(0.2)
            continue
        if not raw.strip():
            time.sleep(0.2)
            continue
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as err:
            last_error = str(err)
            time.sleep(0.2)
            continue
        if isinstance(parsed, dict):
            return parsed
        last_error = "payload was not an object"
        time.sleep(0.2)

    message = f"timed out waiting for valid JSON file at {path}"
    if last_error:
        message = f"{message}: {last_error}"
    raise RuntimeError(message)


def wait_for_health(url: str, *, service: str, timeout_seconds: float = 20.0) -> dict[str, Any]:
    deadline = time.time() + timeout_seconds
    last_error: str | None = None
    while time.time() < deadline:
        try:
            payload = request_json(url)
        except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as err:
            last_error = str(err)
            time.sleep(0.2)
            continue
        if (
            isinstance(payload, dict)
            and payload.get("service") == service
            and payload.get("status") == "ok"
            and int(payload.get("pid") or 0) > 0
        ):
            return payload
        last_error = f"unexpected payload: {payload!r}"
        time.sleep(0.2)

    message = f"timed out waiting for healthy service at {url}"
    if last_error:
        message = f"{message}: {last_error}"
    raise RuntimeError(message)


def wait_for_service_down(url: str, timeout_seconds: float = 10.0) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            request_json(url, timeout=1.0)
        except Exception:
            return True
        time.sleep(0.2)
    return False


def terminate_process(pid: int) -> None:
    try:
        os.kill(pid, signal.SIGTERM)
    except OSError:
        return


def wait_for_new_desktop_pid(before: set[int], timeout_seconds: float = 25.0) -> ProcessInfo:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        processes = [process for process in find_desktop_processes() if process.pid not in before]
        if processes:
            return processes[0]
        time.sleep(0.2)
    raise RuntimeError("desktop process did not appear in time")


def resolve_runtime_desktop_process(
    *,
    core_pid: int,
    watcher_pid: int,
    before_pids: set[int],
) -> ProcessInfo:
    processes = list_processes()
    by_pid = {process.pid: process for process in processes}

    for runtime_pid in (core_pid, watcher_pid):
        runtime_process = by_pid.get(runtime_pid)
        if runtime_process is None:
            continue
        parent = by_pid.get(runtime_process.ppid)
        if parent and "rterm-desktop" in parent.command:
            return parent

    live_desktops = [process for process in find_desktop_processes() if process.pid not in before_pids]
    if live_desktops:
        return live_desktops[0]

    raise RuntimeError(
        f"unable to resolve live desktop parent for core pid {core_pid} / watcher pid {watcher_pid}"
    )


def run_validation() -> dict[str, Any]:
    if find_desktop_processes():
        raise RuntimeError("desktop validation requires no existing repo-owned rterm-desktop process")

    if is_port_listening("127.0.0.1", WATCHER_PORT):
        raise RuntimeError(
            f"desktop validation requires port 127.0.0.1:{WATCHER_PORT} to be free before launch"
        )

    before_processes = list_processes()
    before_pids = {process.pid for process in before_processes}

    fake_home = Path(tempfile.mkdtemp(prefix="rterm-desktop-validation-home."))
    atexit.register(lambda: shutil.rmtree(fake_home, ignore_errors=True))
    runtime_dir = fake_home / ".rterm"
    runtime_file = runtime_dir / "runtime.json"
    settings_file = runtime_dir / "settings.json"
    log_file = fake_home / "tauri-dev.log"

    env = os.environ.copy()
    env["HOME"] = str(fake_home)
    env["USERPROFILE"] = str(fake_home)
    env.setdefault("RUSTUP_HOME", str(ORIGINAL_HOME / ".rustup"))
    env.setdefault("CARGO_HOME", str(ORIGINAL_HOME / ".cargo"))

    tauri_proc = subprocess.Popen(  # noqa: S603
        ["npm", "run", "tauri:dev"],
        cwd=str(REPO_ROOT),
        env=env,
        stdout=log_file.open("w", encoding="utf-8"),
        stderr=subprocess.STDOUT,
        text=True,
    )

    def cleanup() -> None:
        if tauri_proc.poll() is None:
            tauri_proc.terminate()
            try:
                tauri_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                tauri_proc.kill()
                tauri_proc.wait(timeout=5)

    atexit.register(cleanup)

    wait_for_new_desktop_pid(before_pids)
    try:
        runtime_payload = wait_for_json_file(runtime_file, timeout_seconds=25.0)
    except RuntimeError as err:
        tauri_status = tauri_proc.poll()
        log_excerpt = ""
        if log_file.exists():
            log_excerpt = log_file.read_text(encoding="utf-8", errors="replace")[-4000:]
        raise RuntimeError(
            f"{err}; tauri_exit={tauri_status}; log_tail={log_excerpt!r}"
        ) from err

    core = runtime_payload.get("core") or {}
    watcher = runtime_payload.get("watcher") or {}
    core_pid = int(core.get("pid") or 0)
    watcher_pid = int(watcher.get("pid") or 0)
    core_url = str(core.get("url") or "").rstrip("/")
    watcher_url = str(watcher.get("url") or "").rstrip("/")

    if core_pid <= 0 or watcher_pid <= 0 or not core_url or not watcher_url:
        raise RuntimeError(f"invalid runtime payload: {runtime_payload!r}")
    if not bool(core.get("started_by_ui")) or not bool(watcher.get("started_by_ui")):
        raise RuntimeError(f"runtime payload was not desktop-owned: {runtime_payload!r}")

    core_health = wait_for_health(f"{core_url}/api/v1/health", service="rterm-core")
    watcher_health = wait_for_health(f"{watcher_url}/health", service="rterm-watcher")
    watcher_state = request_json(f"{watcher_url}/watcher/state")
    settings_payload = wait_for_json_file(settings_file, timeout_seconds=10.0)

    if int(core_health.get("pid") or 0) != core_pid:
        raise RuntimeError(f"core pid mismatch: runtime={core_pid} health={core_health!r}")
    if int(watcher_health.get("pid") or 0) != watcher_pid:
        raise RuntimeError(f"watcher pid mismatch: runtime={watcher_pid} health={watcher_health!r}")
    if str(watcher_state.get("backend_url") or "").rstrip("/") != core_url:
        raise RuntimeError(
            f"watcher backend mismatch: expected {core_url}, got {watcher_state!r}"
        )
    if "watcher_mode" not in settings_payload:
        raise RuntimeError(f"settings payload missing watcher_mode: {settings_payload!r}")

    desktop_process = resolve_runtime_desktop_process(
        core_pid=core_pid,
        watcher_pid=watcher_pid,
        before_pids=before_pids,
    )

    terminate_process(desktop_process.pid)
    if not wait_for_process_exit(desktop_process.pid, timeout_seconds=15.0):
        raise RuntimeError("desktop process did not exit after SIGTERM")

    if not wait_for_service_down(
        f"{watcher_url}/health",
        timeout_seconds=DESKTOP_SHUTDOWN_TIMEOUT_SECONDS,
    ):
        raise RuntimeError("watcher health endpoint stayed up after desktop shutdown")
    if process_exists(core_pid):
        raise RuntimeError(f"core pid {core_pid} was still alive after desktop shutdown")
    if process_exists(watcher_pid):
        raise RuntimeError(f"watcher pid {watcher_pid} was still alive after desktop shutdown")
    if runtime_file.exists():
        raise RuntimeError(f"runtime file was not cleared after shutdown: {runtime_file}")

    if tauri_proc.poll() is None:
        tauri_proc.terminate()
        try:
            tauri_proc.wait(timeout=20)
        except subprocess.TimeoutExpired as err:
            raise RuntimeError("npm run tauri:dev wrapper did not exit after validator cleanup") from err

    after_desktop_processes = find_desktop_processes()
    leaked_desktop = [process for process in after_desktop_processes if process.pid not in before_pids]
    if leaked_desktop:
        raise RuntimeError(f"desktop process leak detected: {leaked_desktop!r}")

    return {
        "desktop_pid": desktop_process.pid,
        "core_pid": core_pid,
        "watcher_pid": watcher_pid,
        "core_url": core_url,
        "watcher_url": watcher_url,
        "watcher_mode": settings_payload.get("watcher_mode"),
        "log_file": str(log_file),
        "runtime_dir": str(runtime_dir),
    }


def main() -> int:
    summary = run_validation()
    print(json.dumps({"status": "ok", "validation": summary}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
