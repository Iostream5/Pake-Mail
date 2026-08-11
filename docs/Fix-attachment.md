Expand the attachment fix to support ALL normal email attachment file types, not PDF only.

Goal:
Pake-Mail must preserve arbitrary user-uploaded attachment files correctly when sending email through Gmail.

Supported examples include:
- PDF
- DOC
- DOCX
- XLS
- XLSX
- PPT
- PPTX
- TXT
- CSV
- JPG/JPEG
- PNG
- GIF
- WEBP
- ZIP
- and other normal binary/text files that are valid email attachments.

Do NOT hardcode the implementation around application/pdf.

Requirements:

1. Preserve the original file bytes exactly.
2. Fetch attachments as binary data using response.arrayBuffer() / Buffer.
3. Never convert arbitrary attachment bytes to UTF-8 strings.
4. Determine the MIME type from the stored file metadata/content type, with a safe fallback such as application/octet-stream when unknown.
5. Preserve the original filename safely.
6. Build a valid multipart/mixed MIME message.
7. Use CRLF (\r\n) consistently throughout MIME headers and boundaries.
8. Each attachment must have:
   Content-Type: <detected MIME type>
   Content-Disposition: attachment; filename="<safe filename>"
   Content-Transfer-Encoding: base64
9. Base64-encode the binary attachment exactly once.
10. Do not double-base64 encode attachment data.
11. Do not accidentally decode/re-encode attachment data through UTF-8.
12. The final Gmail `raw` message must be encoded according to the Gmail API requirement exactly once.
13. Multiple attachments in the same email must each have their own correct MIME section and boundary.
14. Preserve attachment ordering where practical.
15. Keep the existing 25 MB Gmail message/attachment size validation.
16. Attachment fetch failures must remain classified as `attachment` errors.
17. Do not modify the original files stored in Supabase Storage.

Testing:

Create a generic attachment MIME test suite covering at least:
- PDF
- DOCX
- XLSX
- PNG
- JPG/JPEG
- TXT
- ZIP
- CSV

For every fixture:
1. Start with known original bytes.
2. Generate the MIME message.
3. Extract/decode the attachment from the generated MIME.
4. Compare decoded bytes against the original bytes.
5. Assert byte-for-byte equality.

Also test:
- one email with multiple different attachment types
- unknown MIME type → application/octet-stream
- filenames containing spaces
- filenames containing non-ASCII characters
- long filenames
- empty/invalid filename fallback
- attachment larger than the configured Gmail size limit
- failed storage fetch

Important:
Do not "fix" this by changing file extensions or converting files into text.
The attachment must remain the exact original binary file.

Inspect the existing implementation first and identify:
- where attachment bytes are fetched
- where MIME type is obtained
- where MIME is constructed
- where base64 encoding occurs
- where Gmail `raw` encoding occurs

Then make the smallest correct refactor to create a generic attachment encoder/helper that works for arbitrary attachment types.

Do not change:
- BullMQ behavior
- retry logic
- active window
- Redis configuration
- OAuth scopes
- batch logic
- database schema
- frontend

Run:
- npx tsc --noEmit
- npm run lint
- all relevant attachment/MIME tests