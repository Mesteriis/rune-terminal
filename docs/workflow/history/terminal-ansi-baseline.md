# Terminal ANSI baseline

Date: `2026-04-16`

## Current baseline

- Runtime used the existing live validation stack from slices 1 and 2:
  - core: `http://127.0.0.1:61420`
  - frontend dev: `http://127.0.0.1:4203`
- Commands sent to `term-main` through `POST /api/v1/terminal/term-main/input` with `append_newline:true`:
  - `printf '\033[31mANSI_BATCH_RED\033[0m\n'`
  - `python3 -c 'import sys,time; [sys.stdout.write(f"\rANSI_BASE_PROGRESS_{i}/5") or sys.stdout.flush() or time.sleep(0.05) for i in range(1,6)]; print()'`
  - `python3 -c 'import sys; print("ansi-row-a"); print("ansi-row-b"); sys.stdout.write("\x1b[2A"); sys.stdout.write("\rANSI_ROW_A\nANSI_ROW_B\n"); sys.stdout.flush()'`

## Observed behavior

- Backend snapshot tails contained the expected raw ANSI/control data:
  - color output used `\u001b[31m...\u001b[0m`
  - progress output used repeated `\rANSI_BASE_PROGRESS_n/5`
  - redraw output used `\u001b[2A` followed by replacement lines
- The visible terminal viewport rendered the expected final state:
  - `ANSI_BATCH_RED` appeared as colored output
  - the progress loop settled on `ANSI_BASE_PROGRESS_5/5`
  - the redraw command left `ANSI_ROW_A` and `ANSI_ROW_B` visible

## Current issues

- No visible ANSI rendering break was observed in the active tab during the baseline run.
- No visible raw escape leakage was observed in the rendered viewport; earlier `.view-term` text probing was not treated as authoritative because it included shell command echo/accessibility text.
- Replay during tab switching was not judged in this baseline step; that is the remaining slice-3 validation check.
