"use client"

import * as React from "react"
import { Dialog } from "./dialog"
import { Button } from "./button"
import { ButtonProps } from "./button"

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: ButtonProps["variant"]
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "HAPUS",
  cancelText = "BATAL",
  variant = "danger",
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false)

  const handleConfirm = async () => {
    try {
      setLoading(true)
      await onConfirm()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} className="max-w-md">
      <div className="mt-6 flex justify-end gap-3 border-t border-ash-stroke pt-4">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={variant}
          size="sm"
          onClick={handleConfirm}
          loading={loading}
          className="min-w-[80px]"
        >
          {confirmText}
        </Button>
      </div>
    </Dialog>
  )
}
