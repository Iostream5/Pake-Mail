import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const { rows, onDuplicate } = await request.json()
    if (!Array.isArray(rows) || rows.length === 0) return apiError("CSV rows required")

    const results = { created: 0, skipped: 0, merged: 0, errors: [] as string[] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.companyName || !row.hrEmail) {
        results.errors.push(`Row ${i + 1}: companyName and hrEmail are required`)
        continue
      }

      const existing = await prisma.recipient.findUnique({
        where: { userId_hrEmail: { userId, hrEmail: row.hrEmail } },
      })

      if (existing) {
        if (onDuplicate === "skip") {
          results.skipped++
        } else if (onDuplicate === "merge") {
          await prisma.recipient.update({
            where: { id: existing.id },
            data: {
              companyName: row.companyName ?? existing.companyName,
              position: row.position ?? existing.position,
              location: row.location ?? existing.location,
              website: row.website ?? existing.website,
              source: row.source ?? existing.source,
              notes: row.notes ?? existing.notes,
              tags: row.tags ?? existing.tags,
            },
          })
          results.merged++
        } else {
          results.skipped++
        }
      } else {
        await prisma.recipient.create({
          data: { userId, ...row },
        })
        results.created++
      }
    }

    return apiSuccess(results)
  })
}
