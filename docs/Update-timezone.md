Fix the active-window timezone bug in the worker.

Context:
The batch configuration is:
- activeHoursStart = "08:00"
- activeHoursEnd = "17:00"
- activeDays = "MON,TUE,WED,THU,FRI"
- User timezone is WIB (Asia/Jakarta).

At 12:30 WIB (05:30 UTC), the worker currently logs:
"DELAYED until 2026-08-11T08:00:00.000Z"
which means it incorrectly waits until 15:00 WIB.

This indicates active-window.ts is comparing the batch's wall-clock active hours against UTC instead of the intended local timezone.

Please inspect the current implementation of:
- lib/active-window.ts
- workers/email-worker.ts
- any code that constructs or passes the current Date into active-window.ts

Fix the implementation so activeHoursStart/activeHoursEnd are interpreted as local wall-clock hours consistently.

Important:
1. Do NOT change the batch database schema.
2. Do NOT change the stored values "08:00", "17:00", or "MON,TUE,...".
3. Do NOT change Railway timezone settings as a workaround.
4. Preserve null fields = always allowed.
5. Preserve both activeDays formats already supported.
6. Preserve nextWindowStart behavior.
7. At 12:30 WIB, a batch configured 08:00-17:00 WIB must be considered inside the active window and must NOT be delayed.
8. At 18:00 WIB, it should be delayed until the next valid active window.
9. Add/update unit tests specifically for Asia/Jakarta/WIB timezone boundaries.
10. Make the timezone handling explicit and deterministic. Do not rely on the server's implicit timezone.

Before editing, inspect the existing implementation and explain exactly where the UTC/local-time mismatch occurs. Then implement the smallest correct fix.

Afterward run:
- npx tsc --noEmit
- npm run lint
- the active-window unit tests