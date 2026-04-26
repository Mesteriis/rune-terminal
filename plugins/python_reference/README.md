# Python Reference Plugin

This directory contains a minimal non-Go implementation of the
`rterm.plugin.v1` JSON-line stdio protocol.

It is intentionally a reference fixture, not product plugin discovery:

- `plugin.py` responds to the core handshake with `example.python_reference`.
- It exposes one tool, `plugin.python_echo`.
- It declares the `tool.execute` capability so core allow-list validation is
  exercised by the same runtime used for Go plugins.
- `core/plugins` launches it through `OSProcessSpawner` in integration tests.

Manual smoke:

```sh
python3 plugins/python_reference/plugin.py
```

Then send one handshake JSON line and one request JSON line on stdin.
