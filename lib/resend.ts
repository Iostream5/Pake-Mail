import { prisma } from "./prisma"

export const GUARD_RAIL = {
  MIN_THRESHOLD_DAYS: 3,
  MAX_RESEND_COUNT: 3,
  DEFAULT_APPROVAL_WINDOW_HOURS: 24,
  DEFAULT_THRESHOLD_DAYS: 7,
  DEFAULT_MAX_COUNT: 1,
} as const

export function validateResendSettings(thresholdDays: number, maxCount: number) {
  if (thresholdDays < GUARD_RAIL.MIN_THRESHOLD_DAYS) {
    return { valid: false as const, error: `Threshold minimum ${GUARD_RAIL.MIN_THRESHOLD_DAYS} hari` }
  }
  if (maxCount < 1 || maxCount > GUARD_RAIL.MAX_RESEND_COUNT) {
    return { valid: false as const, error: `Maksimal resend ${GUARD_RAIL.MAX_RESEND_COUNT} kali` }
  }
  return { valid: true as const }
}

export async function getEffectiveSettings(
  userId: string,
  batch?: {
    resendEnabledOverride?: boolean | null
    resendThresholdDaysOverride?: number | null
    resendMaxCountOverride?: number | null
  } | null
) {
  const settings = await prisma.settings.findUnique({ where: { userId } })

  const defaults = {
    resendEnabled: settings?.resendEnabledDefault ?? false,
    resendThresholdDays:
      settings?.resendThresholdDaysDefault ?? GUARD_RAIL.DEFAULT_THRESHOLD_DAYS,
    resendMaxCount: settings?.resendMaxCountDefault ?? GUARD_RAIL.DEFAULT_MAX_COUNT,
    approvalWindowHours:
      settings?.resendApprovalWindowHours ?? GUARD_RAIL.DEFAULT_APPROVAL_WINDOW_HOURS,
  }

  if (!batch) return defaults

  return {
    resendEnabled: batch.resendEnabledOverride ?? defaults.resendEnabled,
    resendThresholdDays:
      batch.resendThresholdDaysOverride ?? defaults.resendThresholdDays,
    resendMaxCount: batch.resendMaxCountOverride ?? defaults.resendMaxCount,
    approvalWindowHours: defaults.approvalWindowHours,
  }
}

export function shouldAutoResend(
  recipient: {
    status: string
    sentAt: Date | null
    resendCount: number
  },
  thresholdDays: number,
  maxCount: number
) {
  if (!["SENT", "APPLIED"].includes(recipient.status)) return false
  if (!recipient.sentAt) return false
  if (recipient.resendCount >= maxCount) return false

  const elapsedDays =
    (Date.now() - recipient.sentAt.getTime()) / (1000 * 60 * 60 * 24)
  return elapsedDays >= thresholdDays
}
