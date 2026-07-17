import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterCoverPage from './page'
import { ApiError } from '@/lib/api'
import type { NdefRecord } from '@/lib/nfc'

const { useAuthMock, useRegisterCoverMock, useOfficesMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRegisterCoverMock: vi.fn(),
  useOfficesMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }))
// eslint-disable-next-line @next/next/no-img-element -- test stub replacing next/image
vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => <img alt={String(props.alt)} /> }))
vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useCovers', () => ({ useRegisterCover: useRegisterCoverMock }))
vi.mock('@/hooks/useOffices', () => ({ useOffices: useOfficesMock }))
vi.mock('@/lib/qr', () => ({
  createCoverLabelSvg: vi.fn(() => '<svg />'),
  downloadSvg: vi.fn(),
  svgToDataUrl: vi.fn(() => 'data:image/svg+xml,'),
}))

// Simulate a Chrome-on-Android NDEFReader that fires a text record on scan().
function installNdefReader(text: string) {
  class FakeReader {
    onreading: ((event: { message: { records: NdefRecord[] } }) => void) | null = null
    scan = vi.fn(async () => {
      const encoder = new TextEncoder()
      const record: NdefRecord = {
        recordType: 'text',
        encoding: 'utf-8',
        data: new DataView(encoder.encode(text).buffer),
      }
      this.onreading?.({ message: { records: [record] } })
    })
  }
  ;(window as unknown as { NDEFReader?: unknown }).NDEFReader = FakeReader
}

function removeNdefReader() {
  delete (window as unknown as { NDEFReader?: unknown }).NDEFReader
}

const mutateAsync = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  removeNdefReader()
  useAuthMock.mockReturnValue({
    user: { id: 'admin-1', name: 'Admin', role: 'admin', officeId: 'office-1' },
  })
  useOfficesMock.mockReturnValue({
    data: [{ id: 'office-1', name: 'การไฟฟ้าสงขลา' }],
    isLoading: false,
  })
  mutateAsync.mockResolvedValue({
    data: {
      id: 'cover-1',
      assetCode: 'PEA-0001',
      qrCode: 'SCC:office-1:PEA-0001',
      status: 'IN_STOCK',
      ownerOfficeId: 'office-1',
      currentOfficeId: 'office-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  })
  useRegisterCoverMock.mockReturnValue({ mutateAsync, isPending: false, error: null })
})

afterEach(() => removeNdefReader())

describe('RegisterCoverPage — single add (Flow 2)', () => {
  it('registers with assetCode only and omits nfcId from the payload', async () => {
    const user = userEvent.setup()
    render(<RegisterCoverPage />)

    await user.type(screen.getByLabelText(/รหัสทรัพย์สิน/), 'PEA-0001')
    await user.selectOptions(screen.getByLabelText(/สำนักงานเจ้าของ/), 'office-1')
    await user.click(screen.getByRole('button', { name: 'ลงทะเบียน' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    const payload = mutateAsync.mock.calls[0][0]
    expect(payload).toEqual({ assetCode: 'PEA-0001', ownerOfficeId: 'office-1' })
    expect(payload).not.toHaveProperty('nfcId')
  })

  it('sends nfcId when the NFC field is filled and keeps it distinct from assetCode', async () => {
    const user = userEvent.setup()
    render(<RegisterCoverPage />)

    await user.type(screen.getByLabelText(/รหัสทรัพย์สิน/), 'PEA-0001')
    await user.type(screen.getByLabelText(/รหัสใน NFC tag/), 'NFC-ABC-999')
    await user.selectOptions(screen.getByLabelText(/สำนักงานเจ้าของ/), 'office-1')
    await user.click(screen.getByRole('button', { name: 'ลงทะเบียน' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0]).toEqual({
      assetCode: 'PEA-0001',
      nfcId: 'NFC-ABC-999',
      ownerOfficeId: 'office-1',
    })
  })

  it('routes a scanned NFC text record into the nfcId field, not assetCode', async () => {
    installNdefReader('TAG-SCANNED-42')
    const user = userEvent.setup()
    render(<RegisterCoverPage />)

    await user.type(screen.getByLabelText(/รหัสทรัพย์สิน/), 'PEA-0001')
    await user.click(screen.getByRole('button', { name: /อ่าน NFC/ }))

    await waitFor(() =>
      expect(screen.getByLabelText(/รหัสใน NFC tag/)).toHaveValue('TAG-SCANNED-42'),
    )
    // The asset code must be untouched by the scan.
    expect(screen.getByLabelText(/รหัสทรัพย์สิน/)).toHaveValue('PEA-0001')
  })

  it('shows the SCC:office:asset QR preview derived from office + asset code', async () => {
    const user = userEvent.setup()
    render(<RegisterCoverPage />)

    await user.type(screen.getByLabelText(/รหัสทรัพย์สิน/), 'PEA-0001')
    await user.selectOptions(screen.getByLabelText(/สำนักงานเจ้าของ/), 'office-1')

    expect(screen.getByLabelText(/QR Code ที่ระบบจะสร้าง/)).toHaveValue('SCC:office-1:PEA-0001')
  })

  it('blocks submit and shows a validation error when assetCode is empty', async () => {
    const user = userEvent.setup()
    render(<RegisterCoverPage />)

    await user.selectOptions(screen.getByLabelText(/สำนักงานเจ้าของ/), 'office-1')
    await user.click(screen.getByRole('button', { name: 'ลงทะเบียน' }))

    expect(await screen.findByText('กรุณากรอกรหัสทรัพย์สิน')).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('surfaces a duplicate/conflict API error message to the user', async () => {
    useRegisterCoverMock.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new ApiError('รหัสทรัพย์สินซ้ำ', 'CONFLICT', 409)),
      isPending: false,
      error: new ApiError('รหัสทรัพย์สินซ้ำ', 'CONFLICT', 409),
    })
    render(<RegisterCoverPage />)

    expect(await screen.findByText('รหัสทรัพย์สินซ้ำ')).toBeInTheDocument()
  })

  it('warns that NFC scanning is unavailable on unsupported browsers', () => {
    render(<RegisterCoverPage />)
    expect(
      screen.getByText(/ปุ่มอ่าน NFC ใช้ได้บน Chrome Android/),
    ).toBeInTheDocument()
  })
})
