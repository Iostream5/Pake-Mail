Now perform a production-readiness review of the implementation you just made.

Do NOT modify code yet.

Inspect the actual implementation and verify specifically:

1. How SURAT_LAMARAN DOCX is detected.
2. How the template is selected when a batch has multiple documents.
3. Whether {{company}}, {{position}}, and {{date}} are replaced correctly.
4. Whether docxtemplater handles placeholders split across DOCX runs.
5. Whether the original DOCX buffer can ever be mutated.
6. Whether Gotenberg uses process.env.GOTENBERG_URL.
7. Whether the Gotenberg endpoint is exactly /forms/libreoffice/convert.
8. Whether Gotenberg failures correctly propagate into the existing worker retry/error classification.
9. Whether a failed conversion can accidentally result in SENT.
10. Whether generated PDF buffers are released after sending.
11. Whether existing CV/PDF attachments remain untouched.
12. Whether Gmail's 25 MB total attachment limit is still enforced after adding the generated PDF.
13. Whether there are duplicate database queries.
14. Whether one recipient can accidentally reuse another recipient's rendered PDF.
15. Whether the DOCX template is fetched/rendered once per recipient as intended.
16. Whether any generated PDF is persisted to Supabase Storage or Redis.
17. Whether this works correctly with BullMQ concurrency = 1.
18. Whether pause/resume/stop behavior remains compatible.
19. Whether Auto-Stop behavior remains compatible.

Pay special attention to the fact that each recipient must receive a DIFFERENT personalized PDF.

Do not rely on previous report text. Inspect the actual code.

Return:

- PASS
- FAIL
- NEEDS FIX

for every item above, with exact file + line references and a short explanation.

Do not make changes until the review is complete.