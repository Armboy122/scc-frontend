import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cover, Installation, WorkOrder } from '@/lib/types'
import RemovePage from './page'

const {
  completeRemovalMock,
  replaceMock,
  scanRemoveMock,
  useRemovalProgressMock,
  useWorkOrderMock,
} = vi.hoisted(() => ({
  completeRemovalMock: vi.fn(),
  replaceMock: vi.fn(),
  scanRemoveMock: vi.fn(),
  useRemovalProgressMock: vi.fn(),
  useWorkOrderMock: vi.fn(),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, use: () => ({ id: 'wo-1' }) }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    refresh: vi.fn(),
    replace: replaceMock,
  }),
}))

vi.mock('@/hooks/useWorkOrders', () => ({
  useWorkOrder: useWorkOrderMock,
  useRemovalProgress: useRemovalProgressMock,
  useScanRemove: () => ({
    mutateAsync: scanRemoveMock,
    isPending: false,
  }),
  useCompleteRemoval: () => ({
    mutateAsync: completeRemovalMock,
    isPending: false,
  }),
}))

vi.mock('@/lib/scanFeedback', () => ({
  triggerScanFeedback: vi.fn(),
}))

vi.mock('@/components/feature/QrScanner', () => ({
  QrScanner: ({ onScan }: { onScan: (code: string) => void }) => (
    <button type="button" onClick={() => onScan('QR-SCAN')}>สแกน QR</button>
  ),
}))

vi.mock('@/components/feature/CoverScanList', () => ({
  CoverScanList: ({
    covers,
    readOnly,
  }: {
    covers: Array<{ code: string }>
    readOnly?: boolean
  }) => (
    <div data-testid="removed-cover-list" data-read-only={String(Boolean(readOnly))}>
      {covers.map((cover) => <span key={cover.code}>{cover.code}</span>)}
      {!readOnly && <button type="button">ยกเลิกการถอด</button>}
    </div>
  ),
}))

vi.mock('@/components/feature/PhotoCapture', () => ({
  PhotoCapture: ({ onChange, disabled }: {
    onChange: (file: File) => void
    disabled?: boolean
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(new File(['photo'], 'remove.jpg', { type: 'image/jpeg' }))}
    >
      เลือกรูปหลักฐาน
    </button>
  ),
}))

vi.mock('@/components/ui/FeedbackDialog', () => ({
  FeedbackDialog: ({ title, message }: { title: string; message: string }) => (
    <div role="dialog"><h2>{title}</h2><p>{message}</p></div>
  ),
}))

const firstInstallation: Installation = {
  id: 'inst-1',
  workOrderId: 'wo-1',
  coverId: 'cover-1',
  createdAt: '2026-07-04T00:00:00Z',
  installedAt: '2026-07-04T00:01:00Z',
  removedAt: '2026-07-10T00:01:00Z',
}

const secondInstallation: Installation = {
  id: 'inst-2',
  workOrderId: 'wo-1',
  coverId: 'cover-2',
  createdAt: '2026-07-04T00:00:01Z',
  installedAt: '2026-07-04T00:02:00Z',
}

const baseOrder: WorkOrder = {
  id: 'wo-1',
  status: 'REMOVING',
  customerName: 'Customer One',
  plannedQty: 99,
  officeId: 'office-1',
  installations: [firstInstallation, secondInstallation],
  createdAt: '2026-07-04T00:00:00Z',
  updatedAt: '2026-07-10T00:00:00Z',
}

const removedCover: Cover = {
  id: 'cover-2',
  assetCode: 'COVER-002',
  qrCode: 'QR-SCAN',
  status: 'IN_STOCK',
  ownerOfficeId: 'office-1',
  currentOfficeId: 'office-1',
  createdAt: '2026-07-04T00:00:00Z',
  updatedAt: '2026-07-10T00:02:00Z',
}

function progressFor(installations: Installation[]) {
  return installations.map((installation, index) => ({
    installationId: installation.id,
    coverId: installation.coverId,
    code: `COVER-00${index + 1}`,
    installedAt: installation.installedAt,
    removedAt: installation.removedAt,
    usesCoverIdFallback: false,
  }))
}

describe('RemovePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useWorkOrderMock.mockReturnValue({ data: baseOrder, isLoading: false })
    useRemovalProgressMock.mockReturnValue({
      data: progressFor(baseOrder.installations!),
      error: null,
      isFetching: false,
      isLoading: false,
    })
    scanRemoveMock.mockResolvedValue(removedCover)
    completeRemovalMock.mockResolvedValue({ data: { ...baseOrder, status: 'COMPLETED' } })
  })

  it('derives progress from server installations and exposes no local undo', () => {
    render(<RemovePage params={Promise.resolve({ id: 'wo-1' })} />)

    expect(screen.getByText('1 / 2 ชิ้น')).toBeInTheDocument()
    expect(screen.queryByText('99 ชิ้น')).not.toBeInTheDocument()
    expect(screen.getByTestId('removed-cover-list')).toHaveAttribute('data-read-only', 'true')
    expect(screen.queryByRole('button', { name: 'ยกเลิกการถอด' })).not.toBeInTheDocument()
    expect(screen.getByText('COVER-001')).toBeInTheDocument()
  })

  it('posts a manual removal scan immediately without waiting for close', async () => {
    const user = userEvent.setup()
    render(<RemovePage params={Promise.resolve({ id: 'wo-1' })} />)

    await user.type(screen.getByPlaceholderText('ป้อนรหัสด้วยตนเอง'), 'COVER-002')
    await user.click(screen.getByRole('button', { name: 'บันทึกการถอด' }))

    await waitFor(() => expect(scanRemoveMock).toHaveBeenCalledWith({
      id: 'wo-1',
      coverCode: 'COVER-002',
    }))
    expect(completeRemovalMock).not.toHaveBeenCalled()
  })

  it('posts a QR removal scan through the same immediate server mutation', async () => {
    const user = userEvent.setup()
    render(<RemovePage params={Promise.resolve({ id: 'wo-1' })} />)

    await user.click(screen.getByRole('button', { name: 'สแกน QR' }))

    await waitFor(() => expect(scanRemoveMock).toHaveBeenCalledWith({
      id: 'wo-1',
      coverCode: 'QR-SCAN',
    }))
    expect(completeRemovalMock).not.toHaveBeenCalled()
  })

  it('keeps close disabled while any server installation remains open', () => {
    render(<RemovePage params={Promise.resolve({ id: 'wo-1' })} />)

    expect(screen.getByRole('button', { name: 'ปิดงาน (1/2 ชิ้น)' })).toBeDisabled()
  })

  it('submits the complete server installation snapshot after all are removed and a photo is selected', async () => {
    const user = userEvent.setup()
    const allRemovedInstallations: Installation[] = [
      firstInstallation,
      { ...secondInstallation, removedAt: '2026-07-10T00:02:00Z' },
    ]
    const allRemovedOrder = { ...baseOrder, installations: allRemovedInstallations }
    useWorkOrderMock.mockReturnValue({ data: allRemovedOrder, isLoading: false })
    useRemovalProgressMock.mockReturnValue({
      data: progressFor(allRemovedInstallations),
      error: null,
      isFetching: false,
      isLoading: false,
    })

    render(<RemovePage params={Promise.resolve({ id: 'wo-1' })} />)

    await user.click(screen.getByRole('button', { name: 'เลือกรูปหลักฐาน' }))
    await user.click(screen.getByRole('button', { name: 'ปิดงาน (2/2 ชิ้น)' }))
    await user.click(screen.getByRole('button', { name: 'ปิดงาน' }))

    await waitFor(() => expect(completeRemovalMock).toHaveBeenCalledWith({
      id: 'wo-1',
      payload: {
        installations: allRemovedInstallations,
        photoFile: expect.any(File),
      },
    }))
  })
})
