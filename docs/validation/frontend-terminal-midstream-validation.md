# frontend terminal mid-stream validation

Date: `2026-04-16`

## Command used

- `python3 -u -c "import time; [print(f'MIDSTREAM_AUTO_{i:02d}', flush=True) or time.sleep(0.3) for i in range(1, 31)]"`

## Steps

1. Started core on `127.0.0.1:52770` and frontend dev server on `127.0.0.1:4200`.
2. Ran the command in `Main Shell`.
3. Waited `700ms` and captured visible markers before switching tabs.
4. Switched to `Ops Shell` while output was still streaming.
5. Waited `2500ms` on `Ops Shell`.
6. Switched back to `Main Shell`.
7. Captured visible markers `600ms` after return, then again `1500ms` later.
8. Waited for completion and checked final marker counts.

## Observed behavior

- Before switch: `MIDSTREAM_AUTO_01` was visible and no duplicate markers were present.
- After return: markers `01..12` were visible with no duplicates.
- `1500ms` later on the returned tab: markers `01..17` were visible with no duplicates.
- Final state: markers `01..30` were visible exactly once each, with no missing or duplicate markers.
- Browser console errors for the validation window: `0`.
- Backend snapshot check `GET /api/v1/terminal/term-main?from=0` still reported `auto_markers: 30` and a running session.

## Match against expected result

- `no lost output`: yes
- `no duplicated output`: yes
- `stream resumes correctly`: yes
- `no renderer reset`: yes
- `no sequence desync`: yes

Conclusion: current mid-stream tab switch behavior matches the expected result for this slice.
