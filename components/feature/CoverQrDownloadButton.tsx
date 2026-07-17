'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createCoverLabelSvg, downloadSvg } from '@/lib/qr'
import type { Cover } from '@/lib/types'

interface CoverQrDownloadButtonProps {
  cover: Cover
  size?: 'sm' | 'md'
  fullWidth?: boolean
  className?: string
  ownerOfficeName?: string
}

export function CoverQrDownloadButton({
  cover,
  size = 'sm',
  fullWidth = false,
  className = '',
  ownerOfficeName,
}: CoverQrDownloadButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      fullWidth={fullWidth}
      className={className}
      leftIcon={<Download className="w-4 h-4" />}
      onClick={() => downloadSvg(`cover-${cover.assetCode}.svg`, ownerOfficeName ? createCoverLabelSvg(cover, ownerOfficeName) : createCoverLabelSvg(cover))}
      aria-label={`โหลด QR ${cover.assetCode}`}
    >
      โหลด QR
    </Button>
  )
}
