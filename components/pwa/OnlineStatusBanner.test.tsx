import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OnlineStatusBanner,
  RECOVERY_MESSAGE_DURATION_MS,
} from './OnlineStatusBanner'

describe('OnlineStatusBanner', () => {
  let online: boolean

  beforeEach(() => {
    online = true
    vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => online)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('announces an initially offline session without claiming queued work', () => {
    online = false
    render(<OnlineStatusBanner />)

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('การดึงหรือบันทึกข้อมูลต้องรออินเทอร์เน็ต')
    expect(status).not.toHaveTextContent(/ซิงก์แล้ว|ส่งแล้ว|เข้าคิว/)
  })

  it('shows a recovery warning, then dismisses it', () => {
    vi.useFakeTimers()
    render(<OnlineStatusBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    online = false
    act(() => window.dispatchEvent(new Event('offline')))
    expect(screen.getByRole('status')).toHaveTextContent('ออฟไลน์')

    online = true
    act(() => window.dispatchEvent(new Event('online')))
    expect(screen.getByRole('status')).toHaveTextContent(
      'ระบบไม่ได้ส่งงานให้อัตโนมัติ',
    )

    act(() => vi.advanceTimersByTime(RECOVERY_MESSAGE_DURATION_MS))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
