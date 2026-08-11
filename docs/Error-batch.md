error "2026-08-11 03:35:34.522 [error] Error: Custom Id cannot contain :
    at tm.validateOptions (.next/server/chunks/[root-of-the-server]__1igu7s5._.js:2:68047)
    at tm.addJob (.next/server/chunks/[root-of-the-server]__1igu7s5._.js:2:66954)
    at tm.createBulk (.next/server/chunks/[root-of-the-server]__1igu7s5._.js:2:55836)
    at async (.next/server/chunks/[root-of-the-server]__1igu7s5._.js:8953:60585)"


Fix the production error in the current worker refactor.

Production error:

Error: Custom Id cannot contain :
at BullMQ addJob/createBulk

Root cause:
The implementation uses deterministic BullMQ job IDs in the format:

"send:<batchRecipientId>"

BullMQ rejects ":" in custom job IDs.

Required fix

Replace the deterministic job ID format with:

"send-<batchRecipientId>"

Do NOT use ":".

Create a single shared helper, preferably:

"getSendJobId(batchRecipientId)"

which returns:

"send-${batchRecipientId}"

Use this helper everywhere the deterministic send job ID is created, removed, or looked up.

Update ALL relevant paths:

- "app/api/batches/start/route.ts"
- "app/api/batches/resume/route.ts"
- "app/api/batches/pause/route.ts"
- "app/api/batches/stop/route.ts"
- "lib/batch-progress.ts"
- any other worker/queue code that references "send:<batchRecipientId>"

Do not leave mixed ID formats in the codebase.

Important

Do NOT change the underlying idempotency strategy.

The purpose remains:

one BatchRecipient → one deterministic BullMQ job ID

Double-start must remain idempotent.

Pause/stop/Auto-Stop must still be able to remove the correct queued job.

Do not change the database schema.

Do not change Redis configuration.

Do not change Gmail sending behavior.

Validation

Search the entire repository for:

"send:"

and ensure no active code still generates deterministic BullMQ IDs containing ":".

Then run:

- "npx tsc --noEmit"
- "npm run lint"
- "npm run build"
- existing worker unit tests

Finally verify "/api/batches/start" can successfully call "emailQueue.addBulk()" without the Custom Id error.

Report exactly which files were changed.