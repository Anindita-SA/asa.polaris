---
trigger: always_on
description: Scope lock and strict change discipline
---

# Change discipline

1. Scope lock: modify only what the task names. No refactors, renames, reformatting, or dependency changes outside scope.
2. Before editing, read .agent/ARCHITECTURE.md. List files you will touch and every other feature that shares them. If a HIGH RISK file is involved, wait for my approval.
3. Minimal diff. Never delete or rewrite working code to fix something else.
4. If the fix needs an out-of-scope change, stop and ask.
5. After editing, run every REGRESSION.md check for each feature listed as affected in step 2, and report pass/fail per check. Never say "fixed" without this.
6. End with: what changed, what was deliberately left untouched.
7. If a fix fails twice, stop and revert. Do not stack patches.
8. After the task, update ARCHITECTURE.md and REGRESSION.md if you added or changed a feature, table, or shared file. If a bug slipped through, add a check that would have caught it.
