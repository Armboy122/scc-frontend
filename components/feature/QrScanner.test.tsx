import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { startMock, stopMock, clearMock } = vi.hoisted(() => ({
  startMock: vi.fn(),
  stopMock: vi.fn(),
  clearMock: vi.fn(),
}))

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: class {
    start = startMock
    stop = stopMock
    clear = clearMock
  },
}))

import { QrScanner } from './QrScanner'

describe('QrScanner', () => {
  beforeEach(() => {
    startMock.mockReset().mockResolvedValue(undefined)
    stopMock.mockReset().mockResolvedValue(undefined)
    clearMock.mockReset()
  })

  it('traps focus, closes with Escape, and restores focus to its trigger', async () => {
    const user = userEvent.setup()
    render(<QrScanner onScan={vi.fn()} />)

    const trigger = screen.getByRole('button', { name: 'สแกน QR Code' })
    await user.click(trigger)

    expect(await screen.findByRole('dialog', { name: 'สแกน QR Code' })).toBeInTheDocument()
    const close = screen.getByRole('button', { name: 'ปิด' })
    const cancel = screen.getByRole('button', { name: 'ยกเลิก' })
    expect(close).toHaveFocus()

    await user.tab({ shift: true })
    expect(cancel).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('shows a clear Thai message when camera permission is denied', async () => {
    startMock.mockRejectedValueOnce(new Error('Permission denied'))
    const onError = vi.fn()
    const user = userEvent.setup()
    render(<QrScanner onScan={vi.fn()} onError={onError} />)

    await user.click(screen.getByRole('button', { name: 'สแกน QR Code' }))

    const message = 'ไม่ได้รับอนุญาตให้ใช้กล้อง — เปิดสิทธิ์กล้องในการตั้งค่า แล้วลองใหม่'
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(onError).toHaveBeenCalledWith(message)
  })
})
