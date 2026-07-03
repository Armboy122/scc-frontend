import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CoverQrDownloadButton } from './CoverQrDownloadButton'
import { createCoverLabelSvg, downloadSvg } from '@/lib/qr'
import type { Cover } from '@/lib/types'

vi.mock('@/lib/qr', () => ({
  createCoverLabelSvg: vi.fn(() => '<svg />'),
  downloadSvg: vi.fn(),
}))

describe('CoverQrDownloadButton', () => {
  it('downloads the QR label for an existing cover', async () => {
    const user = userEvent.setup()
    const cover: Cover = {
      id: 'cover-1',
      assetCode: 'PEA-001',
      qrCode: 'SCC:office-1:PEA-001',
      status: 'IN_STOCK',
      ownerOfficeId: 'office-1',
      currentOfficeId: 'office-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }

    render(<CoverQrDownloadButton cover={cover} />)
    await user.click(screen.getByRole('button', { name: 'โหลด QR PEA-001' }))

    expect(createCoverLabelSvg).toHaveBeenCalledWith(cover)
    expect(downloadSvg).toHaveBeenCalledWith('cover-PEA-001.svg', '<svg />')
  })
})
