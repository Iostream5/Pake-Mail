import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi } from "@/lib/api-helpers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const recipients = await prisma.recipient.findMany({
      where: { userId },
      select: {
        companyName: true,
        hrEmail: true,
        position: true,
        location: true,
        website: true,
        source: true,
        tags: true,
      },
    })

    const header = "companyName,hrEmail,position,location,website,source,tags"
    const csv = [
      header,
      ...recipients.map((r) =>
        [r.companyName, r.hrEmail, r.position ?? "", r.location ?? "", r.website ?? "", r.source ?? "", r.tags ?? ""]
          .map((v) => `"${v.replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="recipients.csv"',
      },
    })
  })
}
