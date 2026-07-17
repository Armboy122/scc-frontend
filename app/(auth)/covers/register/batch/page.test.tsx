import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BatchRegisterPage from './page'

const { useAuthMock, useBatchRegisterCoversMock, useOfficesMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useBatchRegisterCoversMock: vi.fn(),
  useOfficesMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }))
// eslint-disable-next-line @next/next/no-img-element -- test stub replacing next/image
vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => <img alt={String(props.alt)} /> }))
vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useCovers', () => ({ useBatchRegisterCovers: useBatchRegisterCoversMock }))
vi.mock('@/hooks/useOffices', () => ({ useOffices: useOfficesMock }))
vi.mock('@/lib/qr', () => ({
  createCoverLabelSvg: vi.fn(() => '<svg />'),
  downloadSvg: vi.fn(),
  svgToDataUrl: vi.fn(() => 'data:image/svg+xml,'),
}))

// A single reader whose onreading we can fire repeatedly to emulate tapping
// several tags after one "start scanning" press.
class FakeReader {
  onreading: ((event: { message: { records: { recordType: string; encoding: string; data: DataView }[] } }) => void) | null = null
  scan = vi.fn(async () => {})
}
let reader: FakeReader

// Fire one tag tap and let React commit before the next tap. In the field,
// taps are seconds apart so the component always sees committed state; act()
// reproduces that ordering deterministically in the test.
async function tap(text: string) {
  const data = new DataView(new TextEncoder().encode(text).buffer)
  await act(async () => {
    reader.onreading?.({ message: { records: [{ recordType: 'text', encoding: 'utf-8', data }] } })
  })
}

function installReader() {
  reader = new FakeReader()
  ;(window as unknown as { NDEFReader?: unknown }).NDEFReader = class {
    constructor() {
      return reader
    }
  }
}
function removeReader() {
  delete (window as unknown as { NDEFReader?: unknown }).NDEFReader
}

const mutateAsync = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  removeReader()
  useAuthMock.mockReturnValue({
    user: { id: 'admin-1', name: 'Admin', role: 'admin', officeId: 'office-1' },
  })
  mutateAsync.mockResolvedValue({ data: [] })
  useBatchRegisterCoversMock.mockReturnValue({ mutateAsync, isPending: false, error: null })
  useOfficesMock.mockReturnValue({ data: [{ id: 'office-1', name: 'สำนักงานหนึ่ง', workHubId: 'hub-1' }], isLoading: false })
})

afterEach(() => removeReader())

async function prepare(user: ReturnType<typeof userEvent.setup>, codes: string) {
  // The office field is pre-filled from the signed-in user's officeId
  // (office-1), so it is not typed again here.
  await user.type(screen.getByLabelText('รหัสทรัพย์สิน'), codes)
  await user.click(screen.getByRole('button', { name: 'เตรียมรายการ' }))
}

describe('BatchRegisterPage — multi register (Flow 4)', () => {
  it('prepares one row per pasted asset code', async () => {
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1\nPEA-2\nPEA-3')

    expect(screen.getByLabelText('NFC tag 1')).toBeInTheDocument()
    expect(screen.getByLabelText('NFC tag 3')).toBeInTheDocument()
    expect(screen.getByText('0/3')).toBeInTheDocument()
  })

  it('does not build rows when duplicate asset codes are pasted', async () => {
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1\nPEA-1')

    // Correct behavior: the duplicate set is rejected, so no rows are created.
    expect(screen.queryByLabelText('NFC tag 1')).not.toBeInTheDocument()
  })

  // BUG-BATCH-PREP (P2): prepareRows() sets scanMessage for the empty and
  // duplicate cases, but the scanMessage element is only rendered inside the
  // `rows.length > 0` block. On a first attempt the list stays empty, so the
  // warning is never shown and the "เตรียมรายการ" button appears to do nothing.
  // This test documents the intended behavior and currently fails.
  it.fails('should surface the duplicate warning to the user', async () => {
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1\nPEA-1')

    expect(await screen.findByText(/รหัสทรัพย์สินซ้ำ: PEA-1/)).toBeInTheDocument()
  })

  it.fails('should surface the empty-input warning to the user', async () => {
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await user.click(screen.getByRole('button', { name: 'เตรียมรายการ' }))

    expect(
      await screen.findByText('กรุณาใส่รหัสทรัพย์สินอย่างน้อย 1 รายการ'),
    ).toBeInTheDocument()
  })

  it('matches sequentially tapped tags to rows in order after a single start', async () => {
    installReader()
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1\nPEA-2')

    await user.click(screen.getByRole('button', { name: /เริ่มแตะ NFC/ }))
    await tap('TAG-A')
    await tap('TAG-B')

    await waitFor(() => expect(screen.getByLabelText('NFC tag 1')).toHaveValue('TAG-A'))
    expect(screen.getByLabelText('NFC tag 2')).toHaveValue('TAG-B')
    expect(reader.scan).toHaveBeenCalledTimes(1)
  })

  it('ignores a duplicate tag tap instead of assigning it to the next row', async () => {
    installReader()
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1\nPEA-2')

    await user.click(screen.getByRole('button', { name: /เริ่มแตะ NFC/ }))
    await tap('TAG-A')
    await tap('TAG-A') // same physical tag tapped twice

    await waitFor(() => expect(screen.getByLabelText('NFC tag 1')).toHaveValue('TAG-A'))
    expect(screen.getByLabelText('NFC tag 2')).toHaveValue('')
    expect(await screen.findByText(/ถูกจับคู่ไปแล้ว/)).toBeInTheDocument()
  })

  it('submits {assetCode, nfcId, ownerOfficeId} for every row', async () => {
    installReader()
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1\nPEA-2')

    await user.click(screen.getByRole('button', { name: /เริ่มแตะ NFC/ }))
    await tap('TAG-A')
    await tap('TAG-B')
    await waitFor(() => expect(screen.getByLabelText('NFC tag 2')).toHaveValue('TAG-B'))

    await user.click(screen.getByRole('button', { name: /ลงทะเบียน 2 รายการ/ }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith({
      ownerOfficeId: 'office-1',
      items: [
        { assetCode: 'PEA-1', nfcId: 'TAG-A', ownerOfficeId: 'office-1' },
        { assetCode: 'PEA-2', nfcId: 'TAG-B', ownerOfficeId: 'office-1' },
      ],
    })
  })

  it('blocks submit and flags a row that has not been tapped yet', async () => {
    installReader()
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1\nPEA-2')

    await user.click(screen.getByRole('button', { name: /เริ่มแตะ NFC/ }))
    await tap('TAG-A') // only the first row is matched
    await waitFor(() => expect(screen.getByLabelText('NFC tag 1')).toHaveValue('TAG-A'))

    await user.click(screen.getByRole('button', { name: /ลงทะเบียน 2 รายการ/ }))

    expect(await screen.findByText('ยังไม่ได้แตะ')).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('supports manual NFC entry as a fallback in the table', async () => {
    const user = userEvent.setup()
    render(<BatchRegisterPage />) // no reader — manual path
    await prepare(user, 'PEA-1')

    await user.type(screen.getByLabelText('NFC tag 1'), 'MANUAL-TAG')
    await user.click(screen.getByRole('button', { name: /ลงทะเบียน 1 รายการ/ }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0].items[0]).toEqual({
      assetCode: 'PEA-1',
      nfcId: 'MANUAL-TAG',
      ownerOfficeId: 'office-1',
    })
  })

  it('ignores a scan that carries no readable text record', async () => {
    installReader()
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1')

    await user.click(screen.getByRole('button', { name: /เริ่มแตะ NFC/ }))
    await act(async () => reader.onreading?.({ message: { records: [] } }))

    expect(await screen.findByText(/ไม่พบข้อความรหัสใน NFC tag/)).toBeInTheDocument()
    expect(screen.getByLabelText('NFC tag 1')).toHaveValue('')
  })

  it('warns and does not start scanning on an unsupported browser', async () => {
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1')

    // The start button is disabled without NDEFReader; the support hint is shown.
    expect(screen.getByText(/การอ่าน NFC ใช้ได้บน Chrome Android/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /เริ่มแตะ NFC/ })).toBeDisabled()
  })

  it('stops scanning when the stop button is pressed', async () => {
    installReader()
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1\nPEA-2')

    await user.click(screen.getByRole('button', { name: /เริ่มแตะ NFC/ }))
    await user.click(await screen.findByRole('button', { name: /หยุดอ่าน/ }))

    // After stop, a tap must no longer be applied to a row.
    await tap('TAG-A')
    const row1 = screen.getByLabelText('NFC tag 1') as HTMLInputElement
    expect(row1.value).toBe('')
    expect(screen.getByRole('button', { name: /เริ่มแตะ NFC/ })).toBeInTheDocument()
  })

  it('exposes the row QR preview as SCC:office:asset', async () => {
    const user = userEvent.setup()
    render(<BatchRegisterPage />)
    await prepare(user, 'PEA-1')

    const row = screen.getByLabelText('NFC tag 1').closest('tr') as HTMLElement
    expect(within(row).getByText('SCC:office-1:PEA-1')).toBeInTheDocument()
  })
})
