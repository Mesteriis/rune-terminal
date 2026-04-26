#!/usr/bin/env python3
"""Language-neutral reference implementation of rterm.plugin.v1."""

from __future__ import annotations

import json
import sys
from typing import Any


PROTOCOL_VERSION = "rterm.plugin.v1"
PLUGIN_ID = "example.python_reference"
PLUGIN_VERSION = "1.0.0"
TOOL_NAME = "plugin.python_echo"


def read_json_line() -> dict[str, Any]:
    line = sys.stdin.readline()
    if line == "":
        raise RuntimeError("unexpected eof")
    return json.loads(line)


def write_json_line(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def write_error(request_id: str, code: str, message: str) -> None:
    write_json_line(
        {
            "type": "response",
            "request_id": request_id,
            "status": "error",
            "error": {
                "code": code,
                "message": message,
            },
        }
    )


def main() -> int:
    handshake = read_json_line()
    if handshake.get("type") != "handshake":
        raise RuntimeError(f"unexpected handshake type: {handshake.get('type')}")
    if handshake.get("protocol_version") != PROTOCOL_VERSION:
        raise RuntimeError(f"unsupported protocol version: {handshake.get('protocol_version')}")

    write_json_line(
        {
            "type": "handshake",
            "manifest": {
                "plugin_id": PLUGIN_ID,
                "plugin_version": PLUGIN_VERSION,
                "protocol_version": PROTOCOL_VERSION,
                "exposed_tools": [TOOL_NAME],
                "capabilities": ["tool.execute"],
            },
        }
    )

    request = read_json_line()
    request_id = str(request.get("request_id", ""))
    input_payload = request.get("input") or {}
    text = input_payload.get("text")
    if not isinstance(text, str) or text.strip() == "":
        write_error(request_id, "invalid_input", "text is required")
        return 0

    context = request.get("context") or {}
    write_json_line(
        {
            "type": "response",
            "request_id": request_id,
            "status": "ok",
            "output": {
                "language": "python",
                "text": text,
                "uppercase": text.upper(),
                "length": len(text),
                "workspace_id": context.get("workspace_id", ""),
                "repo_root": context.get("repo_root", ""),
            },
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
