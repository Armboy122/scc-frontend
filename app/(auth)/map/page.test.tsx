import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Cover, WorkOrder } from '@/lib/types'
import InstalledCoverMapPage from './page'

const cover: Cover = {
  id: 'cover-1',
  assetCode: 'PEA0000000001',
  qrCode: 'SCC:office-62:PEA0000000001',
  status: 'IN_STOCK',
  ownerOfficeId: 'office-62',
  currentOfficeId: 'office-62',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const completedOrder: WorkOrder = {
  id: 'work-order-1',
  status: 'COMPLETED',
  customerName: 'ลูกค้าประวัติ',
  requestNumber: '130000000001',
  plannedQty: 1,
  officeId: 'office-62',
  gpsLat: 7.01,
  gpsLng: 100.48,
  installations: [{
    id: 'installation-1',
    workOrderId: 'work-order-1',
    coverId: 'cover-1',
    gpsLat: 7.01,
    gpsLng: 100.48,
    installedAt: '2026-01-15T01:00:00Z',
    removedAt: '2026-01-15T10:00:00Z',
    createdAt: '2026-01-15T01:00:00Z',
  }],
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
}

vi.mock('@/hooks/useWorkOrders', () => ({
  useAllWorkOrders: () => ({ data: [completedOrder], isLoading: false, error: null }),
}))

vi.mock('@/hooks/useCovers', () => ({
  useAllCovers: () => ({ data: [cover], isLoading: false, error: null }),
}))

vi.mock('@/components/feature/CoverOperationsMap', () => ({
  CoverOperationsMap: ({ mode, sites }: { mode: string; sites: unknown[] }) => (
    <div data-testid="operations-map">{mode}:{sites.length}</div>
  ),
}))

describe('installation history map', () => {
  it('switches from live operations to completed installation history', async () => {
    const user = userEvent.setup()
    render(<InstalledCoverMapPage />)

    expect(screen.getByTestId('operations-map')).toHaveTextContent('ACTIVE:0')
    await user.click(screen.getByRole('button', { name: 'ประวัติ (1)' }))

    expect(screen.getByRole('heading', { name: 'ประวัติการติดตั้งบนแผนที่' })).toBeInTheDocument()
    expect(screen.getByTestId('operations-map')).toHaveTextContent('HISTORY:1')
    expect(screen.getByText('ลูกค้าประวัติ')).toBeInTheDocument()
    expect(screen.getByText('เปิดใบงาน')).toBeInTheDocument()
  })
})
