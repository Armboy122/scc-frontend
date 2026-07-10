'use client'

import { useEffect, useId, useRef, type ElementType } from 'react'
import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { Button } from './Button'

type FeedbackDialogTone = 'success' | 'error'

interface FeedbackDialogProps {
  open: boolean
  tone: FeedbackDialogTone
  title: string
  message: string
  confirmLabel?: string
  onClose: () => void
}

const toneConfig: Record<FeedbackDialogTone, { icon: ElementType; iconClass: string; panelClass: string; buttonVariant: 'primary' | 'danger' }> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-green-600 bg-green-50',
    panelClass: 'border-green-200',
    buttonVariant: 'primary',
  },
  error: {
    icon: AlertTriangle,
    iconClass: 'text-red-600 bg-red-50',
    panelClass: 'border-red-200',
    buttonVariant: 'danger',
  },
}

export function FeedbackDialog({
  open,
  tone,
  title,
  message,
  confirmLabel = 'ตกลง',
  onClose,
}: FeedbackDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    confirmRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [open])

  if (!open) return null

  const config = toneConfig[tone]
  const Icon = config.icon

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
    >
      <div ref={panelRef} className={['w-full max-w-sm rounded-3xl border bg-white p-5 shadow-2xl', config.panelClass].join(' ')}>
        <div className="flex items-start justify-between gap-3">
          <div className={['flex h-12 w-12 items-center justify-center rounded-2xl', config.iconClass].join(' ')}>
            <Icon className="h-7 w-7" aria-hidden />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="ปิด popup"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            {title}
          </h2>
          <p id={messageId} className="text-sm leading-6 text-gray-600">
            {message}
          </p>
        </div>

        <Button
          ref={confirmRef}
          type="button"
          variant={config.buttonVariant}
          size="lg"
          fullWidth
          className="mt-5"
          onClick={onClose}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}
