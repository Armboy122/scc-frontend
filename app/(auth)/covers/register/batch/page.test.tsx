import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BatchRegisterPage from './page'
import { ApiError } from '@/lib/api'

const { useAuthMock, useBatchRegisterCoversMock, useOfficesMock, apiGetMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useBatchRegisterCoversMock: vi.fn(),
  useOfficesMock: vi.fn(),
  apiGetMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }))
vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => <img alt={String(props.alt)} /> }))
vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useCovers', () => ({ useBatchRegisterCovers: useBatchRegisterCoversMock }))
vi.mock('@/hooks/useOffices', () => ({ useOffices: useOfficesMock }))
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, api: { get: apiGetMock } }
})
vi.mock('@/lib/qr', () => ({ createCoverLabelSvg: vi.fn(() => '<svg />'), downloadSvg: vi.fn(), svgToDataUrl: vi.fn(() => 'data:image/svg+xml,') }))

class FakeWriter { write = vi.fn(async () => {}) }
let writer: FakeWriter

function installWriter() {
  writer = new FakeWriter()
  ;(window as unknown as { NDEFReader?: unknown }).NDEFReader = class { constructor() { return writer } }
}
function removeWriter() { delete (window as unknown as { NDEFReader?: unknown }).NDEFReader }

const mutateAsync = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  removeWriter()
  useAuthMock.mockReturnValue({ user: { id: 'admin-1', name: 'Admin', role: 'admin', officeId: 'office-1' } })
  mutateAsync.mockResolvedValue({ data: [] })
  useBatchRegisterCoversMock.mockReturnValue({ mutateAsync, isPending: false, error: null })
  useOfficesMock.mockReturnValue({ data: [{ id: 'office-1', name: 'สำนักงานหนึ่ง', workHubId: 'hub-1' }], isLoading: false })
  // A lookup 404 means this asset code has not yet been registered.
  apiGetMock.mockRejectedValue(new ApiError('ไม่พบข้อมูล', 'NOT_FOUND', 404))
})
afterEach(removeWriter)

async function prepare(user: ReturnType<typeof userEvent.setup>, codes: string) {
  await user.type(screen.getByLabelText('รหัสทรัพย์สิน'), codes)
  await user.click(screen.getByRole('button', { name: 'เตรียมรายการ' }))
}

describe('BatchRegisterPage — write blank NFC tags before registration', () => {
  it('prepares one row per pasted asset code', async () => {
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1\nPEA-2')
    expect(screen.getByLabelText('NFC tag 1')).toHaveTextContent('รอเขียนลง tag ว่าง')
    expect(screen.getByText('0/2')).toBeInTheDocument()
  })

  it('rejects duplicate asset codes before any NFC write', async () => {
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1\nPEA-1')
    expect(screen.queryByLabelText('NFC tag 1')).not.toBeInTheDocument()
    expect(await screen.findByText(/รหัสทรัพย์สินซ้ำ: PEA-1/)).toBeInTheDocument()
  })

  it('writes each next asset code to a blank tag in order', async () => {
    installWriter()
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1\nPEA-2')

    await user.click(screen.getByRole('button', { name: 'เขียน NFC tag ถัดไป' }))
    await waitFor(() => expect(writer.write).toHaveBeenCalledWith('PEA-1'))
    expect(screen.getByLabelText('NFC tag 1')).toHaveTextContent('PEA-1')
    expect(screen.getByLabelText('NFC tag 2')).toHaveTextContent('รอเขียนลง tag ว่าง')

    await user.click(screen.getByRole('button', { name: 'เขียน NFC tag ถัดไป' }))
    await waitFor(() => expect(writer.write).toHaveBeenCalledWith('PEA-2'))
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  it('does not write a code that already exists in the registry', async () => {
    installWriter()
    apiGetMock.mockResolvedValueOnce({ data: { id: 'existing-cover' } })
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1')
    await user.click(screen.getByRole('button', { name: 'เขียน NFC tag ถัดไป' }))

    expect(await screen.findByText(/รหัส PEA-1 มีอยู่ในทะเบียนแล้ว/)).toBeInTheDocument()
    expect(writer.write).not.toHaveBeenCalled()
  })

  it('registers only after every tag has been written, using the written code as nfcId', async () => {
    installWriter()
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1\nPEA-2')
    await user.click(screen.getByRole('button', { name: 'เขียน NFC tag ถัดไป' }))
    await user.click(screen.getByRole('button', { name: 'เขียน NFC tag ถัดไป' }))
    await waitFor(() => expect(writer.write).toHaveBeenCalledTimes(2))

    await user.click(screen.getByRole('button', { name: /ลงทะเบียน 2 รายการ/ }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      ownerOfficeId: 'office-1',
      items: [
        { assetCode: 'PEA-1', nfcId: 'PEA-1', ownerOfficeId: 'office-1' },
        { assetCode: 'PEA-2', nfcId: 'PEA-2', ownerOfficeId: 'office-1' },
      ],
    }))
  })
})
