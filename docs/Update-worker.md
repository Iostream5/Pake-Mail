# Pake-Mail — Sending-Focused Worker Refactor (Revised)

Target repo: `github.com/Iostream5/Pake-Mail` (branch `main`). Work lands on branch `refactor/worker-phase-ab` + PR. Nothing is implemented yet.

Verified against the real code: `autoStopThreshold` is stored as a **fraction** (`Float @default(0.3)`; `/api/batches/route.ts` divides UI percent by 100, `batch-detail.tsx` multiplies back). `RETRY`, `retryCount`, `COMPLETED` already exist in the schema — no migration needed. `activityLog.eventType` is a free-form `String`.

## Phase A — Disable non-core workers

`workers/index.ts` starts the Email Worker unconditionally; Reply, Resend Trigger, Resend Execution, and Notification Batcher each start only behind a flag. Source files and DB models stay untouched.

New `lib/worker-flags.ts`: `boolEnv(name, default=false)` + exported flags `ENABLE_REPLY_WORKER`, `ENABLE_RESEND_WORKERS`, `ENABLE_NOTIFICATION_BATCHER` (all default `false`).

Cleanup on startup (idempotent, wrapped in try/catch so a missing scheduler is a no-op): when a flag is off, call `removeJobScheduler(<id>)` on the matching queue for the scheduler that `scheduleNextPoll` / `scheduleNextBatch` / `scheduleNextResendTrigger` / `scheduleNextResendExecution` create, so legacy repeatables stop consuming Upstash. Re-enabling a flag recreates them via the existing `scheduleNext*` calls.

Note: `workers/notification-batcher.ts` constructs its `Queue` at module scope, so `index.ts` will import it lazily (dynamic `import()`) inside the flag branch to avoid opening a connection when disabled — the batcher file itself is not modified.

## Phase B — Send pipeline

**B3 env parsing** — `numEnv(name, default, {min,max})` in `lib/queue.ts` (exported for reuse): parse, require `Number.isFinite`, clamp/reject out-of-range, else default. Replaces every `Number(x) ?? y` in `lib/queue.ts`. `lib/env.ts` has the same bug but is not on the send path; fixed only if a touched file reads it.

**B1 enqueue** — `start` and `resume` build the job array and call `emailQueue.addBulk()` once, each job with `opts.jobId = "send:<batchRecipientId>"`, `attempts = retryMax + 1`, and the existing cumulative `delay`. Deterministic IDs make a double-start a no-op (BullMQ ignores an existing jobId) and make removal by ID work. The 10s `withTimeout` wrapper around the serial loop is dropped.

**B2 retry** — worker guard accepts `PENDING` and `RETRY`. On failure: read `job.attemptsMade` vs `job.opts.attempts`; if attempts remain → set `RETRY`, `retryCount += 1`, store `errorLog`, **throw** so BullMQ retries. On the final attempt → `FAILED` + `errorLog`, then throw (BullMQ marks it failed; no extra job is enqueued). Success → `SENT`. No manual re-enqueue anywhere.

**B12 error classification** — `lib/email-errors.ts` gains `auth` and `attachment` categories plus `isRetryable(category)`. Worker routing: `permanent`/`attachment` → mark `FAILED`, return **without throwing** (no wasted attempts); `auth` → mark `FAILED`, log, return without throwing (no retry loop on a broken token); `quota`/rate-limit → `job.moveToDelayed(now + backoff)` with a long backoff, no attempt consumed; `temporary`/`unknown` → throw for normal BullMQ retry.

**B4 active window** — new `lib/active-window.ts`: parse `activeHoursStart`/`activeHoursEnd` (`"HH:MM"`) and `activeDays` (handles both the `"MON,TUE"` schema comment form and the `"1,2,3,4,5"` env-default form); `isWithinWindow(now, batch)` and `nextWindowStart(now, batch)`. Null fields = always allowed. Worker checks before doing any Gmail work: outside the window → `job.moveToDelayed(nextWindowStart)` and return; never a failure. `SCHEDULED → RUNNING` transition is unchanged.

**B5/B6 delay + per-account concurrency** — default `BULL_CONCURRENCY` becomes `1` via `numEnv`. Because multiple Gmail accounts can exist, add a race-safe per-account gate in Redis, not just global concurrency: a Lua/`SET NX PX` token on `send-lock:<emailAccountId>` (TTL = `delaySeconds`) plus `last-sent:<emailAccountId>`. If the lock isn't acquired or `now - lastSent < delaySeconds`, the job is `moveToDelayed`-ed to the remaining wait — no send, no attempt consumed. `last-sent` is written only after a successful Gmail send. No `Promise.all` sending.

**B7 progress/completion** — new `lib/batch-progress.ts` with `updateBatchProgress(batchId)`, called after every terminal recipient state change. One `batchRecipient.groupBy({ by: ['status'], _count })` per call — no full-row loads. If no `PENDING` and no `RETRY` remain and the batch is `RUNNING` → `COMPLETED` (+ one `activityLog`). Existing status semantics preserved.

**B8 Auto-Stop** — same helper. Ratio = `FAILED / (SENT + FAILED)` compared against `batch.autoStopThreshold` (fraction as stored). Minimum sample gate of 10 processed recipients so a 1-of-1 failure can't stop a batch. On trip: `Batch → STOPPED`; remaining `PENDING`/`RETRY` → `SKIPPED` in one `updateMany`; their jobs removed by `send:<id>`; `SENT`/`FAILED` untouched; a single `activityLog` written. Guarded by a re-read of batch status so concurrent workers don't run cleanup twice.

**B9/B10 pause / resume / stop** —
- `pause`: remove by real ID `emailQueue.remove("send:<brId>")` for all `PENDING`/`RETRY` recipients (the current `send-<id>` name-based call never worked), then `PAUSED`.
- `resume`: re-query the batch with `batchDocuments` and rebuild full job data — `documentIds`, `userId`, `batchId`, `batchRecipientId`, `emailAccountId`, `templateId` — via `addBulk` with the same deterministic IDs and the cumulative `delaySeconds` spacing. Fixes today's lost attachments and missing `userId` (which broke `activityLog.create`).
- `stop`: mark remaining `PENDING`/`RETRY` as `SKIPPED` **and** remove their queued jobs by ID, so Redis isn't left holding jobs that exist only to be skipped.
- `start` additionally accepts a `RUNNING` batch as a safe idempotent re-enqueue (deterministic IDs make it harmless) — the only behavior addition, and it removes the "worker died, batch stuck" dead end without a new endpoint.

**B11 attachments** — new `lib/attachments.ts`: one `document.findMany({ where: { id: { in: documentIds } } })`; per-file buffer cache keyed by storage key with a bounded TTL (~10 min) **and** a total-bytes cap with LRU-style eviction, so nothing is retained indefinitely; `fetch` responses with `!res.ok` throw a classified `attachment` error; total encoded size validated against Gmail's 25MB limit before send (over limit = permanent error with a clear message). MIME assembled with `\r\n` per RFC 5322; filename encoding kept but applied via a single helper.

**B13 OAuth token persistence** — confirmed: the `tokens` handler is async fire-and-forget and only persists when `refresh_token` is present, so refreshed access tokens are lost. Replace with a synchronous-registered handler that merges and persists the new credentials (including `access_token` + `expiry_date`) and is awaited before send completes, writing only when the token actually changed. Scopes and the auth system are unchanged.

## Phase C — Redis/BullMQ

BullMQ + Upstash stay. Savings come from Phase A (removes ~672 scheduled cycles/day and 4 blocking worker connections), `addBulk` (N round-trips → ~1), and deterministic IDs (no duplicate jobs; pause/stop actually delete). Added: two small keys per email account. No BullMQ state is stripped for the sake of Redis volume.

## Phase D — explicitly out of scope

No recovery endpoint, no reply polling, no auto-resend, no reply-detection work, no frontend refactor, no schema redesign, no deletion of Reply/Resend code.

## Files

Change: `workers/index.ts`, `workers/email-worker.ts`, `lib/queue.ts`, `lib/email-errors.ts`, `app/api/batches/{start,resume,pause,stop}/route.ts`, `.env.example`.
New: `lib/worker-flags.ts`, `lib/batch-progress.ts`, `lib/active-window.ts`, `lib/attachments.ts`.
Untouched: `workers/reply-worker.ts`, `workers/resend-trigger-worker.ts`, `workers/resend-execution-worker.ts`, `workers/notification-batcher.ts`, `lib/gmail-poll.ts`, `lib/resend.ts`, `prisma/schema.prisma`, all auth/OAuth routes, frontend, `Dockerfile`/`railway.json`.

## Testing / validation

Executed before the PR is marked ready: `npx tsc --noEmit` and `npm run lint` (or the repo's configured equivalents), plus `npx prisma validate` to confirm no schema drift. Pure-logic units for `active-window` (inside/outside window, weekend rollover, null fields, both `activeDays` formats), `numEnv` (unset/NaN/out-of-range), and the Auto-Stop ratio + minimum-sample gate. No Gmail/Redis integration test will be claimed as passing unless actually run; manual staging checklist for the PR description: 5-recipient batch end-to-end → `COMPLETED`; double-start creates no duplicates; pause mid-batch then resume with attachments intact; stop clears queued jobs; forced-failure batch trips Auto-Stop; one job forced outside active hours is delayed, not failed; attachment CRLF MIME verified received in Gmail and Outlook.

## Risks & deployment

- Reply detection and auto-resend stop until the flags are turned on; existing data is untouched.
- Scheduler removal is one-way per deploy; flipping a flag back recreates it.
- Jobs queued before deploy have auto-increment IDs and won't match the new pause/stop removal — deploy while no batch is running, or drain the queue first.
- Concurrency 1 slows large batches if anyone relied on the previous parallelism.
- Auto-Stop becomes active for the first time; the 30% default (plus 10-recipient minimum) should be communicated before rollout.
- CRLF MIME change must be verified against real Gmail/Outlook delivery before merge.
