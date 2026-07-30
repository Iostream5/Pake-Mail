import { prisma } from "@/lib/prisma"
import { requireUserId, handleApi, apiSuccess, apiError } from "@/lib/api-helpers"
import { uploadFile } from "@/lib/storage"

const MAX_SIZE = (Number(process.env.MAX_FILE_SIZE_MB) ?? 10) * 1024 * 1024
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES ?? ".pdf,.docx,.jpg,.png").split(",")

const CATEGORY_LIMITS: Record<string, number> = {
  SURAT_LAMARAN: 2,
  CV: 3,
  IJAZAH: 1,
  SKCK: 1,
  TRANSKRIP: 1,
  SERTIFIKAT: 7,
  PAS_FOTO: 2,
  OTHER: 5,
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const userId = await requireUserId()

    const formData = await request.formData()
  const file = formData.get("file") as File | null
  const name = (formData.get("name") as string) ?? file?.name ?? "untitled"
  const category = (formData.get("category") as string) ?? "OTHER"

  if (!file) return apiError("File required")

  const ext = "." + file.name.split(".").pop()?.toLowerCase()
  if (!ALLOWED_TYPES.includes(ext)) {
    return apiError(`File type ${ext} not allowed. Allowed: ${ALLOWED_TYPES.join(", ")}`)
  }

  if (file.size > MAX_SIZE) {
    return apiError(`File too large. Max ${MAX_SIZE / 1024 / 1024}MB`)
  }

  const count = await prisma.document.count({ where: { userId, category: category as any } })
  const limit = CATEGORY_LIMITS[category]
  if (limit !== undefined && count >= limit) {
    return apiError(`Maksimal ${limit} file untuk kategori ini`, 400)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = `documents/${userId}/${Date.now()}-${file.name}`
  const contentType = file.type || "application/octet-stream"

  await uploadFile(key, buffer, contentType)

  const doc = await prisma.document.create({
    data: {
      userId,
      name,
      category: category as any,
      fileUrl: key,
      fileSizeKb: Math.round(file.size / 1024),
    },
  })

  return apiSuccess(doc, 201)
  })
}
