Pake-Mail — Gotenberg DOCX → PDF Proof of Concept

Repository:
github.com/Iostream5/Pake-Mail

Goal:
Implement a small, isolated proof-of-concept to verify that the existing Railway Worker can communicate with the separately deployed Gotenberg service and convert a DOCX document into a valid PDF.

IMPORTANT:
This is ONLY a POC.

DO NOT modify the existing production email sending pipeline.

DO NOT modify:
- BullMQ job flow
- Redis configuration
- batch start/resume/pause/stop behavior
- retry logic
- active-window logic
- attachment sending logic
- Gmail OAuth/token logic
- Prisma schema
- frontend
- existing production email worker behavior

Existing infrastructure:

Railway services:
- worker
- redis
- gotenberg

Gotenberg is already deployed separately using:

gotenberg/gotenberg:8-libreoffice

Gotenberg is confirmed running on port 3000.

The Worker has this environment variable:

GOTENBERG_URL=http://${{gotenberg.RAILWAY_PRIVATE_DOMAIN}}:3000

Do NOT hardcode the Gotenberg hostname.

==================================================
PHASE 1 — HEALTH CHECK
==================================================

Create a small reusable Gotenberg client, for example:

lib/gotenberg.ts

It should expose a function similar to:

checkGotenbergHealth()

The function must:

- read GOTENBERG_URL from process.env
- fail clearly if GOTENBERG_URL is missing
- call the Gotenberg health endpoint
- use a reasonable timeout
- return a useful success/failure result
- never put binary document data into Redis
- never store generated PDFs permanently for this POC

Add enough logging to clearly identify:

[Gotenberg] URL configured
[Gotenberg] Health check started
[Gotenberg] Health check successful

Do NOT log secrets or environment variable credentials.

==================================================
PHASE 2 — DOCX → PDF
==================================================

Create a reusable function similar to:

convertDocxToPdf(docxBuffer, filename)

Requirements:

- accept a DOCX Buffer
- send multipart/form-data to Gotenberg
- use:

POST /forms/libreoffice/convert

- return the generated PDF as a Buffer
- validate the HTTP response
- throw a clear error when conversion fails
- use a reasonable timeout
- do not use Redis
- do not store the PDF permanently
- do not use Promise.all()
- process only one conversion at a time

==================================================
PHASE 3 — TEST FIXTURE
==================================================

Create a minimal DOCX test fixture if the repository does not already contain a suitable test document.

Example content:

Yth. HRD {{company}}

Dengan hormat,

Saya bermaksud mengajukan lamaran kerja untuk posisi {{position}} di {{company}}.

For this POC, replace:

{{company}}
→ PT Test Indonesia

{{position}}
→ Operator Produksi

IMPORTANT:

DOCX must NOT be treated as plain text.

Do not directly string-replace arbitrary bytes inside the DOCX ZIP.

Use an appropriate DOCX manipulation approach/library so the generated DOCX remains valid.

==================================================
PHASE 4 — PLACEHOLDER TEST
==================================================

Create a small helper such as:

lib/document-template.ts

with an API similar to:

renderDocxTemplate(buffer, variables)

It should:

1. Receive the original DOCX Buffer.
2. Replace supported placeholders.
3. Return a valid DOCX Buffer.

At minimum support:

{{company}}
{{position}}

Keep the implementation extensible for future variables such as:

{{hrName}}
{{date}}
{{location}}

Do not integrate this helper into the production batch pipeline yet.

==================================================
PHASE 5 — POC EXECUTION
==================================================

Create a development-only/test-only way to run:

DOCX template
    ↓
replace {{company}} / {{position}}
    ↓
personalized DOCX Buffer
    ↓
Gotenberg
    ↓
PDF Buffer

The test must verify:

1. GOTENBERG_URL is available.
2. Gotenberg health check succeeds.
3. Placeholder replacement succeeds.
4. Resulting DOCX is still valid.
5. Gotenberg accepts the DOCX.
6. HTTP response is successful.
7. Returned PDF is non-empty.
8. No Redis operation is required for conversion.

If the repository already has an appropriate testing framework, use it.

Do not introduce a large testing framework just for this POC.

==================================================
PHASE 6 — OPTIONAL MANUAL VERIFICATION
==================================================

If practical, expose the POC through a development-only script/command rather than modifying a production API.

For example:

npm run test:gotenberg

The command should:

1. load the test DOCX
2. replace placeholders
3. convert using Gotenberg
4. write the resulting PDF to a temporary/local output location
5. print the result

Example expected output:

[Gotenberg] Health check successful
[Template] DOCX rendered successfully
[Gotenberg] Conversion started
[Gotenberg] Conversion successful
[POC] PDF generated successfully
[POC] Output size: XXXX bytes

Do not upload the generated PDF to Supabase.
Do not put it into Redis.

==================================================
PHASE 7 — VALIDATION
==================================================

Run:

npx tsc --noEmit
npm run lint

and the relevant tests.

If any existing tests fail because of unrelated pre-existing issues, clearly distinguish them from issues introduced by this POC.

==================================================
VERY IMPORTANT
==================================================

Do NOT integrate this into:

- batch start
- batch resume
- email worker send logic
- Gmail attachment logic
- production email sending

yet.

Do NOT change the existing sending behavior.

Do NOT change Prisma schema.

Do NOT add a new database table.

Do NOT add Redis keys for generated PDFs.

Do NOT implement the full 72-recipient personalization system yet.

The purpose of this task is ONLY to prove:

Worker
  ↓
Railway private network
  ↓
Gotenberg
  ↓
LibreOffice
  ↓
PDF

At the end, report:

1. Files created
2. Files modified
3. How GOTENBERG_URL is read
4. How the private Railway connection is used
5. Health check result
6. DOCX → PDF conversion result
7. PDF output size
8. TypeScript result
9. Lint result
10. Tests result
11. Any Railway CPU/RAM concerns
12. Any remaining issue before production integration

Do not claim the POC works unless the actual health check and DOCX → PDF conversion were successfully executed.