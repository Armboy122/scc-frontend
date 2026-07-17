import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CheckTagPage from './page'
import { ApiError } from '@/lib/api'
import type { Cover } from '@/lib/types'

const { useAuthMock, useUpdateCoverNfcMock, useOfficesMock, apiGetMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useUpdateCoverNfcMock: vi.fn(),
  useOfficesMock: vi.fn(),
  apiGetMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }))
vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useCovers', () => ({ useUpdateCoverNfc: useUpdateCoverNfcMock }))
vi.mock('@/hooks/useOffices', () => ({ useOffices: useOfficesMock }))
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return { ...actual, api: { ...actual.api, get: apiGetMock } }
})

const cover: Cover = {
  id: 'cover-1',
  assetCode: 'PEA-0001',
  qrCode: 'SCC:office-1:PEA-0001',
  nfcId: 'TAG-OLD',
  status: 'IN_STOCK',
  ownerOfficeId: 'office-1',
  currentOfficeId: 'office-2',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const writeSpy = vi.fn(async () => {})
function installWriter() {
  ;(window as unknown as { NDEFReader?: unknown }).NDEFReader = class {
    write = writeSpy
    onreading: unknown = null
    scan = vi.fn(async () => {})
  }
}
function removeReader() {
  delete (window as unknown as { NDEFReader?: unknown }).NDEFReader
}

const updateMutate = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  removeReader()
  useAuthMock.mockReturnValue({
    user: { id: 'admin-1', name: 'Admin', role: 'admin', officeId: 'office-1' },
  })
  useOfficesMock.mockReturnValue({
    data: [
      { id: 'office-1', name: 'การไฟฟ้าสงขลา' },
      { id: 'office-2', name: 'หาดใหญ่' },
    ],
  })
  updateMutate.mockResolvedValue({ data: { ...cover, nfcId: 'TAG-NEW' } })
  useUpdateCoverNfcMock.mockReturnValue({ mutateAsync: updateMutate })
})

afterEach(() => removeReader())

async function lookupCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  await user.type(screen.getByLabelText(/รหัสจาก tag/), code)
  await user.click(screen.getByRole('button', { name: 'ตรวจสอบ' }))
}

describe('CheckTagPage — inspect and edit NFC tag (Flow 5)', () => {
  it('shows asset code, nfc id, owner/current office and status for a found tag', async () => {
    apiGetMock.mockResolvedValue({ data: cover })
    const user = userEvent.setup()
    render(<CheckTagPage />)

    await lookupCode(user, 'TAG-OLD')

    expect(await screen.findByText('พบ tag ในทะเบียน')).toBeInTheDocument()
    expect(screen.getByText('PEA-0001')).toBeInTheDocument()
    expect(screen.getByText('TAG-OLD')).toBeInTheDocument()
    expect(screen.getByText('การไฟฟ้าสงขลา')).toBeInTheDocument() // owner office
    expect(screen.getByText('หาดใหญ่')).toBeInTheDocument() // current office
  })

  it('looks up by any code (nfc / qr / asset) via the lookup endpoint', async () => {
    apiGetMock.mockResolvedValue({ data: cover })
    const user = userEvent.setup()
    render(<CheckTagPage />)

    await lookupCode(user, 'SCC:office-1:PEA-0001')
    await waitFor(() =>
      expect(apiGetMock).toHaveBeenCalledWith('/covers/lookup', { code: 'SCC:office-1:PEA-0001' }),
    )
  })

  it('reports a clear not-found message on a 404 lookup', async () => {
    apiGetMock.mockRejectedValue(new ApiError('not found', 'NOT_FOUND', 404))
    const user = userEvent.setup()
    render(<CheckTagPage />)

    await lookupCode(user, 'UNKNOWN')
    expect(await screen.findByText('ไม่พบ tag นี้ในทะเบียน')).toBeInTheDocument()
  })

  it('shows the admin edit panel and calls PATCH via updateNfc after writing', async () => {
    apiGetMock
      .mockResolvedValueOnce({ data: cover }) // initial lookup
      .mockRejectedValueOnce(new ApiError('not found', 'NOT_FOUND', 404)) // replacement availability
    installWriter()
    const user = userEvent.setup()
    render(<CheckTagPage />)

    await lookupCode(user, 'TAG-OLD')
    const field = await screen.findByLabelText(/ข้อความใหม่ที่จะเขียนลง NFC/)
    await user.clear(field)
    await user.type(field, 'TAG-NEW')
    await user.click(screen.getByRole('button', { name: /เขียนทับและบันทึกการแก้ไข/ }))

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1))
    expect(writeSpy).toHaveBeenCalledWith('TAG-NEW')
    expect(updateMutate).toHaveBeenCalledWith({ id: 'cover-1', nfcId: 'TAG-NEW' })
    expect(await screen.findByText('เขียน tag และอัปเดตทะเบียนเรียบร้อย')).toBeInTheDocument()
  })

  it('allows non-admin users to inspect a tag but hides the edit panel', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'tech-1', name: 'Tech', role: 'tech', officeId: 'office-1' },
    })
    render(<CheckTagPage />)

    expect(screen.getByLabelText(/รหัสจาก tag/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/ข้อความใหม่ที่จะเขียนลง NFC/)).not.toBeInTheDocument()
  })

  it('prevents reusing an nfc id that already belongs to another tag', async () => {
    apiGetMock
      .mockResolvedValueOnce({ data: cover }) // initial lookup
      .mockResolvedValueOnce({ data: { ...cover, id: 'cover-2' } }) // dup found
    installWriter()
    const user = userEvent.setup()
    render(<CheckTagPage />)

    await lookupCode(user, 'TAG-OLD')
    const field = await screen.findByLabelText(/ข้อความใหม่ที่จะเขียนลง NFC/)
    await user.clear(field)
    await user.type(field, 'TAG-USED-ELSEWHERE')
    await user.click(screen.getByRole('button', { name: /เขียนทับและบันทึกการแก้ไข/ }))

    expect(await screen.findByText('รหัสใหม่นี้ถูกใช้กับ tag อื่นแล้ว')).toBeInTheDocument()
    // Must not write to a tag or persist when the replacement is taken.
    expect(writeSpy).not.toHaveBeenCalled()
    expect(updateMutate).not.toHaveBeenCalled()
  })

  it('clearly warns about the risk when the tag is written but PATCH fails', async () => {
    apiGetMock
      .mockResolvedValueOnce({ data: cover })
      .mockRejectedValueOnce(new ApiError('not found', 'NOT_FOUND', 404))
    updateMutate.mockRejectedValueOnce(new ApiError('server error', 'INTERNAL', 500))
    installWriter()
    const user = userEvent.setup()
    render(<CheckTagPage />)

    await lookupCode(user, 'TAG-OLD')
    const field = await screen.findByLabelText(/ข้อความใหม่ที่จะเขียนลง NFC/)
    await user.clear(field)
    await user.type(field, 'TAG-NEW')
    await user.click(screen.getByRole('button', { name: /เขียนทับและบันทึกการแก้ไข/ }))

    expect(writeSpy).toHaveBeenCalledWith('TAG-NEW')
    expect(
      await screen.findByText(/เขียน NFC แล้ว แต่บันทึกทะเบียนไม่สำเร็จ/),
    ).toBeInTheDocument()
  })

  it('disables the rewrite action when the browser cannot write NFC', async () => {
    apiGetMock.mockResolvedValue({ data: cover })
    const user = userEvent.setup()
    render(<CheckTagPage />) // no NDEFReader

    await lookupCode(user, 'TAG-OLD')
    expect(await screen.findByRole('button', { name: /เขียนทับและบันทึกการแก้ไข/ })).toBeDisabled()
  })
})
