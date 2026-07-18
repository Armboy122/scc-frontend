import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WriteNfcPage from './page'
import { ApiError } from '@/lib/api'

const { useAuthMock, useRegisterCoverMock, useOfficesMock, apiGetMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRegisterCoverMock: vi.fn(),
  useOfficesMock: vi.fn(),
  apiGetMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }))
vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useCovers', () => ({ useRegisterCover: useRegisterCoverMock }))
vi.mock('@/hooks/useOffices', () => ({ useOffices: useOfficesMock }))
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return { ...actual, api: { ...actual.api, get: apiGetMock } }
})

const writeSpy = vi.fn(async () => {})

function installNdefWriter(write: () => Promise<void> = writeSpy) {
  class FakeWriter {
    write = write
  }
  ;(window as unknown as { NDEFReader?: unknown }).NDEFReader = FakeWriter
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
      assetCode: 'COVER-0001',
      qrCode: 'SCC:office-1:COVER-0001',
      nfcId: 'COVER-0001',
      status: 'IN_STOCK',
      ownerOfficeId: 'office-1',
      currentOfficeId: 'office-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  })
  useRegisterCoverMock.mockReturnValue({ mutateAsync, isPending: false, error: null })
  // Default: lookup returns 404 => code is unused and writable.
  apiGetMock.mockRejectedValue(new ApiError('not found', 'NOT_FOUND', 404))
})

afterEach(() => removeNdefReader())

describe('WriteNfcPage — write and register (Flow 3)', () => {
  it('resolves an operator office ID to the office name', () => {
    useAuthMock.mockReturnValue({ user: { id: 'tech-1', name: 'Tech', role: 'tech', officeId: 'office-1' } })
    render(<WriteNfcPage />)

    expect(screen.getByDisplayValue('การไฟฟ้าสงขลา')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('office-1')).not.toBeInTheDocument()
  })

  it('checks uniqueness, writes the tag, then registers with matching assetCode and nfcId', async () => {
    installNdefWriter()
    const user = userEvent.setup()
    render(<WriteNfcPage />)

    await user.type(screen.getByLabelText(/ข้อความที่จะเขียนลง NFC/), 'COVER-0001')
    await user.selectOptions(screen.getByLabelText(/สำนักงานเจ้าของ/), 'office-1')
    await user.click(screen.getByRole('button', { name: /เขียนและลงทะเบียน NFC/ }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    // Uniqueness check happened before write.
    expect(apiGetMock).toHaveBeenCalledWith('/covers/lookup', { code: 'COVER-0001' })
    expect(writeSpy).toHaveBeenCalledWith('COVER-0001')
    // The written text becomes both the asset code and the nfc identifier.
    expect(mutateAsync).toHaveBeenCalledWith({
      assetCode: 'COVER-0001',
      nfcId: 'COVER-0001',
      ownerOfficeId: 'office-1',
    })
    expect(await screen.findByText('เขียนและลงทะเบียนสำเร็จ')).toBeInTheDocument()
  })

  it('refuses to write a code that already exists in the registry', async () => {
    apiGetMock.mockResolvedValue({ data: { cover: { id: 'x' } } })
    installNdefWriter()
    const user = userEvent.setup()
    render(<WriteNfcPage />)

    await user.type(screen.getByLabelText(/ข้อความที่จะเขียนลง NFC/), 'DUP-1')
    await user.selectOptions(screen.getByLabelText(/สำนักงานเจ้าของ/), 'office-1')
    await user.click(screen.getByRole('button', { name: /เขียนและลงทะเบียน NFC/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('มีอยู่ในทะเบียนแล้ว')
    expect(writeSpy).not.toHaveBeenCalled()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('warns without misleading the user when the tag is written but registration fails', async () => {
    mutateAsync.mockRejectedValueOnce(new ApiError('server error', 'INTERNAL', 500))
    installNdefWriter()
    const user = userEvent.setup()
    render(<WriteNfcPage />)

    await user.type(screen.getByLabelText(/ข้อความที่จะเขียนลง NFC/), 'COVER-0002')
    await user.selectOptions(screen.getByLabelText(/สำนักงานเจ้าของ/), 'office-1')
    await user.click(screen.getByRole('button', { name: /เขียนและลงทะเบียน NFC/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('เขียน NFC แล้ว แต่บันทึกทะเบียนไม่สำเร็จ')
    // Success card must not be shown when persistence failed.
    expect(screen.queryByText('เขียนและลงทะเบียนสำเร็จ')).not.toBeInTheDocument()
  })

  it('disables writing and warns when the browser does not support Web NFC', () => {
    render(<WriteNfcPage />) // no NDEFReader installed
    expect(screen.getByText(/การเขียน NFC ใช้ได้บน Chrome Android/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /เขียนและลงทะเบียน NFC/ })).toBeDisabled()
  })
})
