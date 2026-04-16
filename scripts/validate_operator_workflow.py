#!/usr/bin/env python3
"""Validation for cross-surface operator workflow handoffs."""

from __future__ import annotations

import atexit
import json
import os
import shutil
import socket
import subprocess
import tempfile
import threading
import time
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[1]
AUTH_TOKEN = "operator-workflow-token"
MODEL_NAME = "test-model"


@dataclass
class HTTPResponse:
    status: int
    body: Any


class OllamaStubHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/api/tags":
            self.send_response(404)
            self.end_headers()
            return
        payload = {"models": [{"name": MODEL_NAME}]}
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/chat":
            self.send_response(404)
            self.end_headers()
            return
        length = int(self.headers.get("Content-Length", "0"))
        payload = b""
        if length > 0:
            payload = self.rfile.read(length)
        prompt = "operator-workflow-validation"
        if payload:
            try:
                decoded = json.loads(payload)
                messages = decoded.get("messages") or []
                for message in reversed(messages):
                    if message.get("role") == "user":
                        prompt = (message.get("content") or "").strip() or prompt
                        break
            except json.JSONDecodeError:
                pass
        response = {
            "model": MODEL_NAME,
            "message": {
                "role": "assistant",
                "content": f"stub-response: {prompt}",
            },
        }
        encoded = json.dumps(response).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def start_ollama_stub(port: int) -> tuple[ThreadingHTTPServer, threading.Thread]:
    server = ThreadingHTTPServer(("127.0.0.1", port), OllamaStubHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread


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
        with urlopen(req, timeout=8) as resp:  # noqa: S310
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
    target_file = REPO_ROOT / "docs" / "workspace-model.md"
    assert target_file.exists(), f"missing expected file: {target_file}"

    ollama_port = free_port()
    core_port = free_port()
    state_dir = Path(tempfile.mkdtemp(prefix="rterm-operator-workflow-validation."))
    ollama_server, _ = start_ollama_stub(ollama_port)
    atexit.register(ollama_server.shutdown)
    atexit.register(lambda: shutil.rmtree(state_dir, ignore_errors=True))

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
    env["RTERM_OLLAMA_BASE_URL"] = f"http://127.0.0.1:{ollama_port}"
    env["RTERM_OLLAMA_MODEL"] = MODEL_NAME
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

        # 1) select file -> use in AI
        attachment_reference = request_json(
            method="POST",
            url=f"{base_url}/api/v1/agent/conversation/attachments/references",
            token=AUTH_TOKEN,
            payload={"path": str(target_file)},
        )
        assert attachment_reference.status == 200, attachment_reference.body
        attachment = attachment_reference.body.get("attachment")
        assert isinstance(attachment, dict) and attachment.get("id"), attachment_reference.body

        conversation_before = request_json(
            method="GET",
            url=f"{base_url}/api/v1/agent/conversation",
            token=AUTH_TOKEN,
        )
        assert conversation_before.status == 200, conversation_before.body
        before_messages = ((conversation_before.body.get("conversation") or {}).get("messages")) or []
        before_message_count = len(before_messages)

        conversation_submit = request_json(
            method="POST",
            url=f"{base_url}/api/v1/agent/conversation/messages",
            token=AUTH_TOKEN,
            payload={
                "prompt": "operator workflow attachment check",
                "attachments": [attachment],
                "context": {
                    "workspace_id": "ws-local",
                    "repo_root": str(REPO_ROOT),
                    "active_widget_id": "term-main",
                    "target_session": "local",
                    "target_connection_id": "local",
                    "widget_context_enabled": True,
                },
            },
        )
        assert conversation_submit.status == 200, conversation_submit.body
        submitted_messages = ((conversation_submit.body.get("conversation") or {}).get("messages")) or []
        assert len(submitted_messages) >= before_message_count + 2, conversation_submit.body

        # 2) select file -> use in /run-related flow
        terminal_before = request_json(
            method="GET",
            url=f"{base_url}/api/v1/terminal/term-main",
            token=AUTH_TOKEN,
        )
        assert terminal_before.status == 200, terminal_before.body
        from_seq = int(terminal_before.body.get("next_seq") or 0)
        marker = "operator-workflow-file-ok"
        command = f'test -f "{target_file}" && echo {marker}'
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
        assert execute.status == 200 and execute.body.get("status") == "ok", execute.body
        wait_for_terminal_output(
            base_url=base_url,
            token=AUTH_TOKEN,
            widget_id="term-main",
            from_seq=from_seq,
            expected_substring=marker,
            min_occurrences=2,
        )

        # 3) terminal output -> explain
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
                    "repo_root": str(REPO_ROOT),
                    "active_widget_id": "term-main",
                    "target_session": "local",
                    "target_connection_id": "local",
                    "widget_context_enabled": True,
                },
            },
        )
        assert explain.status == 200, explain.body
        output_excerpt = str(explain.body.get("output_excerpt") or "")
        assert marker in output_excerpt, explain.body

        # 4) tool execution -> audit visibility
        list_widgets = request_json(
            method="POST",
            url=f"{base_url}/api/v1/tools/execute",
            token=AUTH_TOKEN,
            payload={
                "tool_name": "workspace.list_widgets",
                "input": {},
                "context": {
                    "workspace_id": "ws-local",
                    "active_widget_id": "term-main",
                    "repo_root": str(REPO_ROOT),
                    "target_session": "local",
                    "target_connection_id": "local",
                },
            },
        )
        assert list_widgets.status == 200 and list_widgets.body.get("status") == "ok", list_widgets.body
        audit = request_json(
            method="GET",
            url=f"{base_url}/api/v1/audit",
            token=AUTH_TOKEN,
            query={"limit": 100},
        )
        assert audit.status == 200, audit.body
        audit_events = audit.body.get("events") or []
        assert any(
            event.get("tool_name") == "workspace.list_widgets" and event.get("success") is True
            for event in audit_events
        ), audit.body

        # 5) MCP invoke remains explicit
        conversation_mid = request_json(
            method="GET",
            url=f"{base_url}/api/v1/agent/conversation",
            token=AUTH_TOKEN,
        )
        assert conversation_mid.status == 200, conversation_mid.body
        conversation_mid_count = len(((conversation_mid.body.get("conversation") or {}).get("messages")) or [])

        mcp_blocked = request_json(
            method="POST",
            url=f"{base_url}/api/v1/mcp/invoke",
            token=AUTH_TOKEN,
            payload={
                "server_id": "mcp.example",
                "payload": {"ping": "operator-workflow"},
                "allow_on_demand_start": False,
            },
        )
        assert mcp_blocked.status in (200, 409), mcp_blocked.body

        mcp_invoked = request_json(
            method="POST",
            url=f"{base_url}/api/v1/mcp/invoke",
            token=AUTH_TOKEN,
            payload={
                "server_id": "mcp.example",
                "payload": {"ping": "operator-workflow"},
                "allow_on_demand_start": True,
                "include_context": True,
            },
        )
        assert mcp_invoked.status == 200, mcp_invoked.body

        conversation_after_mcp = request_json(
            method="GET",
            url=f"{base_url}/api/v1/agent/conversation",
            token=AUTH_TOKEN,
        )
        assert conversation_after_mcp.status == 200, conversation_after_mcp.body
        conversation_after_mcp_count = len(((conversation_after_mcp.body.get("conversation") or {}).get("messages")) or [])
        assert conversation_after_mcp_count == conversation_mid_count, conversation_after_mcp.body

        # 6) remote target remains explicit and not confused with local
        remote_mismatch = request_json(
            method="POST",
            url=f"{base_url}/api/v1/tools/execute",
            token=AUTH_TOKEN,
            payload={
                "tool_name": "term.send_input",
                "input": {
                    "widget_id": "term-main",
                    "text": "echo should-not-run",
                    "append_newline": True,
                },
                "context": {
                    "workspace_id": "ws-local",
                    "active_widget_id": "term-main",
                    "repo_root": str(REPO_ROOT),
                    "target_session": "remote",
                    "target_connection_id": "conn-mismatch",
                },
            },
        )
        assert remote_mismatch.status == 400, remote_mismatch.body
        assert remote_mismatch.body.get("error_code") == "invalid_input", remote_mismatch.body

        return {
            "base_url": base_url,
            "ollama_stub_url": f"http://127.0.0.1:{ollama_port}",
            "state_dir": str(state_dir),
            "checks": {
                "select_file_use_in_ai": "ok",
                "select_file_use_in_run_related_flow": "ok",
                "terminal_output_to_explain": "ok",
                "tool_execution_audit_visibility": "ok",
                "mcp_invoke_explicit_only": "ok",
                "remote_target_explicit_mismatch_guard": "ok",
            },
            "notes": [
                "remote-target explicitness was validated through runtime mismatch guard on a local widget",
                "MCP invoke was validated for explicit invocation and no automatic conversation injection",
            ],
        }
    finally:
        core_proc.terminate()
        try:
            core_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            core_proc.kill()
            core_proc.wait(timeout=5)
        ollama_server.shutdown()


def main() -> int:
    result = run_validation()
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
