---
apply: always
---

После каждого этапа делаешь осмысленый комит и делаешь пуш, общяешся на русском пуш на англиском
Report acceptance checklist:

1. Every claimed fix must map to:
   - exact symptom
   - exact source file
   - exact runtime path
   - exact commit

2. The report must include:
   - commit SHAs
   - changed files
   - why those files are on the active compat path
   - before/after behavior for each named error

3. Rejected reports:
   - “UI renders, so done”
   - “no major console errors” without enumerating actual remaining errors
   - docs-only confirmation without code-path proof
   - broad cleanup outside the listed slice
   - parity work mixed into this slice

4. Required evidence:
   - build/typecheck results
   - console observations after hard reload
   - console observations after terminal input
   - console observations after tab switch
