Pake-Mail — Production Integration: Personalized Application Letter

The Gotenberg DOCX → PDF POC has been successfully verified.

Now integrate the template rendering + Gotenberg conversion into the existing production email worker.

IMPORTANT:
Before modifying anything, inspect the current source code and identify the exact existing flow for:

- batch recipients
- documents / batchDocuments
- email worker
- attachment loading
- Gmail send
- storage keys
- document metadata
- recipient/company/position fields

Do not guess field names.

==================================================
GOAL
==================================================

Allow one reusable DOCX application-letter template to generate a personalized PDF for every recipient.

Example template:

Yth. HRD {{company}}

Dengan hormat,

Saya bermaksud mengajukan lamaran kerja untuk posisi {{position}} di {{company}}.

Hormat saya,

Azhar Adriyan Hasibuan

For each recipient, generate a separate personalized PDF.

Example:

Recipient 1:
company = PT ABC Indonesia
position = Operator Produksi

Output:

Yth. HRD PT ABC Indonesia

...
posisi Operator Produksi di PT ABC Indonesia

Recipient 2:
company = PT XYZ Indonesia
position = Operator Produksi

Output:

Yth. HRD PT XYZ Indonesia

...
posisi Operator Produksi di PT XYZ Indonesia

==================================================
VARIABLES
==================================================

Initially support only:

{{company}}
{{position}}
{{date}}

Use the existing recipient/batch data as the source of truth.

Do NOT create duplicate company/position data.

If the current database stores company information through a relation, use that relation.

For {{date}}, use the appropriate batch/send date according to the existing application semantics.

Do not invent a new database field unless absolutely necessary.

==================================================
TEMPLATE DOCUMENT
==================================================

The template is a DOCX document stored using the existing Pake-Mail document/storage system.

Do NOT hardcode the template filename.

The system must identify the selected template from the existing batch/document configuration.

Inspect the existing batch model and UI flow to determine how documents are associated with a batch.

Do not redesign the frontend in this task unless a minimal change is absolutely required.

==================================================
RENDERING
==================================================

For each recipient:

1. Load the original DOCX template.
2. Render the supported variables.
3. Produce a valid personalized DOCX.
4. Send the personalized DOCX to Gotenberg.
5. Receive the generated PDF Buffer.
6. Use that PDF as the attachment for that recipient's email.

Do NOT modify the original template file.

Do NOT overwrite the original DOCX in storage.

The generated personalized PDF should be temporary unless the existing architecture requires persistence.

Prefer processing in memory.

Do not store generated PDFs in Redis.

==================================================
IMPORTANT DOCX REQUIREMENT
==================================================

DOCX is a ZIP/XML document.

NEVER perform raw string replacement directly on the DOCX binary.

Use the existing POC implementation/library for DOCX templating.

Preserve:

- formatting
- fonts
- paragraphs
- tables
- images
- page layout

Support placeholders that may be split across DOCX XML runs if the selected library supports this correctly.

If the current POC implementation does not safely support split runs, document the limitation and implement the safest compatible solution.

==================================================
GOTENBERG
==================================================

Use:

process.env.GOTENBERG_URL

Do NOT hardcode the Railway hostname.

Reuse the existing Gotenberg client created during the POC.

The conversion endpoint remains:

POST /forms/libreoffice/convert

Add reasonable timeout/error handling.

Never log:

- OAuth tokens
- Gmail credentials
- private URLs containing secrets
- document contents

==================================================
EMAIL WORKER INTEGRATION
==================================================

Integrate this into the existing email sending path.

The high-level flow should become:

BullMQ job
   ↓
load recipient
   ↓
check active window
   ↓
check per-account delay/lock
   ↓
load template/document
   ↓
render variables
   ↓
DOCX → PDF via Gotenberg
   ↓
build attachment
   ↓
Gmail send
   ↓
update SENT / FAILED
   ↓
update batch progress

Do NOT bypass the existing:

- retry handling
- error classification
- attachment validation
- OAuth handling
- per-account concurrency gate
- delay logic
- batch progress
- Auto-Stop

The Gotenberg conversion must be part of the existing send pipeline, not a separate sending mechanism.

==================================================
ATTACHMENT BEHAVIOR
==================================================

If the selected application-letter template is DOCX:

Generate:

Lamaran - <Company>.pdf

or another safe deterministic filename based on the existing filename conventions.

If the user also attached an existing CV/document, preserve the existing attachment behavior.

Example final email:

Attachments:
- Lamaran - PT ABC Indonesia.pdf
- CV Azhar Adriyan Hasibuan.pdf

Do not remove existing attachments.

Do not convert every attachment to PDF.

Only convert the designated DOCX application-letter template.

==================================================
CACHE / RESOURCE USAGE
==================================================

This application targets free-tier infrastructure.

Avoid unnecessary resource consumption.

Requirements:

- process one document conversion per send job
- no Promise.all() for document conversions
- do not keep generated PDFs in memory longer than necessary
- do not persist generated PDFs unless required
- reuse existing source-document buffer cache where appropriate
- do not introduce a second large cache
- clean up temporary resources
- respect existing BullMQ concurrency = 1

A 72-recipient batch should result in approximately:

72 DOCX render operations
72 Gotenberg conversions
72 Gmail sends

Do not accidentally convert the same document multiple times per recipient.

==================================================
ERROR HANDLING
==================================================

Classify document/template/conversion failures appropriately.

Examples:

Template missing:
→ permanent failure

Invalid DOCX:
→ permanent/attachment failure

Gotenberg temporarily unavailable:
→ temporary failure and allow existing retry mechanism

Gotenberg timeout:
→ temporary/unknown according to existing email error classification

PDF exceeds Gmail attachment limit:
→ permanent/attachment failure

Do NOT silently send an email without the personalized application letter if the letter is required.

If conversion fails, the recipient must not be marked SENT.

Use the existing worker error handling rather than creating a second retry mechanism.

==================================================
SECURITY
==================================================

Never trust arbitrary template variables from the client.

Only allow the explicitly supported variables:

{{company}}
{{position}}
{{date}}

Do not implement arbitrary code/template execution.

Escape/handle values safely for DOCX XML manipulation using the selected library.

==================================================
TESTING
==================================================

Add/update tests for:

1. {{company}} replacement
2. {{position}} replacement
3. {{date}} replacement
4. multiple occurrences of the same variable
5. unknown variable behavior
6. DOCX remains valid after rendering
7. Gotenberg conversion succeeds
8. generated PDF is non-empty
9. failed conversion does not send email
10. generated attachment filename is safe
11. original template remains unchanged

Also perform a real staging test:

Create a batch with 2 recipients:

Recipient A:
company = PT Test A
position = Operator Produksi

Recipient B:
company = PT Test B
position = Operator Produksi

Use one DOCX template containing:

{{company}}
{{position}}
{{date}}

Verify that:

Recipient A receives a PDF containing PT Test A.

Recipient B receives a PDF containing PT Test B.

Verify the two PDFs are not identical where the company-specific content differs.

Verify the original DOCX template is unchanged.

==================================================
FREE-TIER VALIDATION
==================================================

After implementation, report:

- number of Gotenberg conversions per recipient
- estimated memory behavior
- whether PDFs are persisted or temporary
- whether Redis usage changes
- whether Supabase Storage usage changes
- whether Railway worker CPU/RAM usage increases
- whether any new database queries were introduced
- whether any new database schema changes were required

Do not claim exact quota usage unless measured.

==================================================
REGRESSION PROTECTION
==================================================

Existing behavior must continue working for batches that do NOT use a DOCX template.

Existing normal PDF attachments must continue working.

Existing email sending must continue working.

Existing retry behavior must remain unchanged.

Existing pause/resume/stop behavior must remain unchanged.

Existing Auto-Stop behavior must remain unchanged.

==================================================
VALIDATION
==================================================

Run:

npx tsc --noEmit
npm run lint
npx prisma validate

Run the relevant tests.

Perform a real 2-recipient staging send.

Do not claim production readiness until the staging send confirms:

DOCX template
→ personalized DOCX
→ Gotenberg
→ personalized PDF
→ Gmail attachment
→ recipient receives correct company-specific PDF.

At the end provide:

1. Files modified
2. Files created
3. Existing code paths inspected
4. New production flow
5. Variables supported
6. Gotenberg integration details
7. Storage behavior
8. Redis impact
9. Supabase impact
10. Railway CPU/RAM impact
11. Test results
12. 2-recipient staging result
13. Remaining risks