#!/usr/bin/env python3
"""Canonical validation for workspace navigation runtime flow.

Scope:
- /api/v1/fs/list
- /api/v1/fs/read
- attachment reference creation
- conversation submit with selected attachment
- /run-equivalent file-path flow via term.send_input + explain
- MCP servers endpoint regression shape
- remote profiles endpoint regression shape
"""

from __future__ import annotations

import atexit
import json
import os
import shutil
import socket
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[1]
AUTH_TOKEN = "workspace-nav-token"
MODEL_NAME = "test-model"


@dataclass
class HTTPResponse:
    status: int
    body: Any


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def write_codex_cli_stub(directory: Path) -> Path:
    stub_path = directory / "codex-cli-stub.py"
    stub_path.write_text(
        """#!/usr/bin/env python3
import sys
from pathlib import Path


def main() -> int:
    args = sys.argv[1:]
    output_path = None
    for index, arg in enumerate(args):
        if arg == "--output-last-message" and index + 1 < len(args):
            output_path = args[index + 1]
            break

    prompt = sys.stdin.read().strip() or "workspace-nav-validation"
    response = f"stub-response: {prompt}"
    if output_path:
        Path(output_path).write_text(response, encoding="utf-8")
    print(response)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
""",
        encoding="utf-8",
    )
    stub_path.chmod(0o700)
    return stub_path


def request_json(
    *,
    method: str,
    url: str,
    token: str,
    payload: dict[str, Any] | None = None,
    query: dict[str, Any] | None = None,
) -> HTTPResponse:
    full_url = url
    if query:
        encoded_query = urlencode(query)
        if encoded_query:
            full_url = f"{url}?{encoded_query}"
    body = None
    headers = {"Authorization": f"Bearer {token}"}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = Request(full_url, data=body, headers=headers, method=method)
    try:
        with urlopen(req, timeout=5) as resp:  # noqa: S310
            raw = resp.read().decode("utf-8")
            return HTTPResponse(resp.status, json.loads(raw) if raw else {})
    except HTTPError as err:
        raw = err.read().decode("utf-8")
        parsed = json.loads(raw) if raw else {}
        return HTTPResponse(err.code, parsed)


def wait_for_health(base_url: str, timeout_seconds: int = 45) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            req = Request(f"{base_url}/healthz", method="GET")
            with urlopen(req, timeout=2) as resp:  # noqa: S310
                if resp.status == 200:
                    return
        except Exception:
            time.sleep(0.25)
            continue
        time.sleep(0.25)
    raise RuntimeError("core /healthz did not become ready in time")


def wait_for_terminal_output(
    *,
    base_url: str,
    token: str,
    widget_id: str,
    from_seq: int,
    expected_substring: str,
    min_occurrences: int = 1,
    timeout_seconds: int = 10,
) -> dict[str, Any]:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        response = request_json(
            method="GET",
            url=f"{base_url}/api/v1/terminal/{widget_id}",
            token=token,
            query={"from": from_seq},
        )
        if response.status == 200:
            chunks = response.body.get("chunks") or []
            output = "".join(str(chunk.get("data") or "") for chunk in chunks)
            if output.count(expected_substring) >= min_occurrences:
                return response.body
        time.sleep(0.25)
    raise AssertionError(f"terminal output did not contain {expected_substring!r} in time")


def run_validation() -> dict[str, Any]:
    target_file = REPO_ROOT / "docs" / "workspace" / "workspace-model.md"
    assert target_file.exists(), f"missing expected file: {target_file}"

    core_port = free_port()
    state_dir = Path(tempfile.mkdtemp(prefix="rterm-workspace-nav-validation."))
    atexit.register(lambda: shutil.rmtree(state_dir, ignore_errors=True))
    codex_cli_stub = write_codex_cli_stub(state_dir)

    base_url = f"http://127.0.0.1:{core_port}"
    core_cmd = [
        "go",
        "run",
        "./cmd/rterm-core",
        "serve",
        "--listen",
        f"127.0.0.1:{core_port}",
        "--workspace-root",
        str(REPO_ROOT),
        "--state-dir",
        str(state_dir),
    ]
    env = os.environ.copy()
    env["RTERM_AUTH_TOKEN"] = AUTH_TOKEN
    env["RTERM_CODEX_CLI_COMMAND"] = str(codex_cli_stub)
    env["RTERM_CODEX_CLI_MODEL"] = MODEL_NAME
    core_proc = subprocess.Popen(  # noqa: S603
        core_cmd,
        cwd=str(REPO_ROOT),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    atexit.register(core_proc.kill)

    try:
        wait_for_health(base_url)

        fs_list = request_json(
            method="GET",
            url=f"{base_url}/api/v1/fs/list",
            token=AUTH_TOKEN,
            query={"path": str(REPO_ROOT)},
        )
        assert fs_list.status == 200, fs_list.body
        assert isinstance(fs_list.body.get("directories"), list), fs_list.body
        assert isinstance(fs_list.body.get("files"), list), fs_list.body
        assert fs_list.body.get("path") == str(REPO_ROOT), fs_list.body

        fs_read = request_json(
            method="GET",
            url=f"{base_url}/api/v1/fs/read",
            token=AUTH_TOKEN,
            query={"path": str(target_file), "max_bytes": 8192},
        )
        assert fs_read.status == 200, fs_read.body
        assert fs_read.body.get("preview_available") is True, fs_read.body
        assert isinstance(fs_read.body.get("preview"), str) and fs_read.body["preview"], fs_read.body

        attachment_ref = request_json(
            method="POST",
            url=f"{base_url}/api/v1/agent/conversation/attachments/references",
            token=AUTH_TOKEN,
            payload={"path": str(target_file)},
        )
        assert attachment_ref.status == 200, attachment_ref.body
        attachment = attachment_ref.body.get("attachment")
        assert isinstance(attachment, dict) and attachment.get("id"), attachment_ref.body

        conversation = request_json(
            method="POST",
            url=f"{base_url}/api/v1/agent/conversation/messages",
            token=AUTH_TOKEN,
            payload={
                "prompt": "workspace navigation canonical validation prompt",
                "attachments": [attachment],
                "context": {
                    "workspace_id": "ws-local",
                    "active_widget_id": "term-main",
                    "repo_root": str(REPO_ROOT),
                    "widget_context_enabled": True,
                    "target_session": "local",
                    "target_connection_id": "local",
                },
            },
        )
        assert conversation.status == 200, conversation.body
        messages = ((conversation.body.get("conversation") or {}).get("messages")) or []
        assert len(messages) >= 2, conversation.body

        terminal_before = request_json(
            method="GET",
            url=f"{base_url}/api/v1/terminal/term-main",
            token=AUTH_TOKEN,
        )
        assert terminal_before.status == 200, terminal_before.body
        from_seq = int(terminal_before.body.get("next_seq") or 0)

        command = f'test -f "{target_file}" && echo workspace-nav-file-ok'
        execute = request_json(
            method="POST",
            url=f"{base_url}/api/v1/tools/execute",
            token=AUTH_TOKEN,
            payload={
                "tool_name": "term.send_input",
                "input": {
                    "widget_id": "term-main",
                    "text": command,
                    "append_newline": True,
                },
                "context": {
                    "workspace_id": "ws-local",
                    "active_widget_id": "term-main",
                    "repo_root": str(REPO_ROOT),
                    "target_session": "local",
                    "target_connection_id": "local",
                },
            },
        )
        assert execute.status == 200, execute.body
        assert execute.body.get("status") == "ok", execute.body

        terminal_after = wait_for_terminal_output(
            base_url=base_url,
            token=AUTH_TOKEN,
            widget_id="term-main",
            from_seq=from_seq,
            expected_substring="workspace-nav-file-ok",
            min_occurrences=2,
        )
        assert isinstance(terminal_after.get("state"), dict), terminal_after
        assert isinstance(terminal_after.get("chunks"), list), terminal_after
        assert isinstance(terminal_after.get("next_seq"), int), terminal_after

        explain = request_json(
            method="POST",
            url=f"{base_url}/api/v1/agent/terminal-commands/explain",
            token=AUTH_TOKEN,
            payload={
                "prompt": f"/run {command}",
                "command": command,
                "widget_id": "term-main",
                "from_seq": from_seq,
                "context": {
                    "workspace_id": "ws-local",
                    "active_widget_id": "term-main",
                    "repo_root": str(REPO_ROOT),
                    "widget_context_enabled": True,
                    "target_session": "local",
                    "target_connection_id": "local",
                },
            },
        )
        assert explain.status == 200, explain.body
        assert isinstance(explain.body.get("output_excerpt"), str) and explain.body["output_excerpt"], explain.body

        mcp_servers = request_json(
            method="GET",
            url=f"{base_url}/api/v1/mcp/servers",
            token=AUTH_TOKEN,
        )
        assert mcp_servers.status == 200, mcp_servers.body
        assert isinstance(mcp_servers.body, dict), mcp_servers.body
        assert isinstance(mcp_servers.body.get("servers"), list), mcp_servers.body

        remote_profiles = request_json(
            method="GET",
            url=f"{base_url}/api/v1/remote/profiles",
            token=AUTH_TOKEN,
        )
        assert remote_profiles.status == 200, remote_profiles.body
        assert isinstance(remote_profiles.body, dict), remote_profiles.body
        assert isinstance(remote_profiles.body.get("profiles"), list), remote_profiles.body

        return {
            "base_url": base_url,
            "codex_cli_stub": str(codex_cli_stub),
            "state_dir": str(state_dir),
            "checks": {
                "fs_list": "ok",
                "fs_read": "ok",
                "attachment_reference": "ok",
                "conversation_with_attachment": "ok",
                "run_equivalent_file_path_flow": "ok",
                "mcp_servers_regression_shape": "ok",
                "remote_profiles_regression_shape": "ok",
            },
            "notes": [
                "remote profiles endpoint was regression-checked only (no remote session launch in this script)",
            ],
        }
    finally:
        core_proc.terminate()
        try:
            core_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            core_proc.kill()
            core_proc.wait(timeout=5)


def main() -> int:
    result = run_validation()
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
