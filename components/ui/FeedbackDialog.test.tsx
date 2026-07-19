import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FeedbackDialog } from './FeedbackDialog'

function DialogHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>เปิดผลลัพธ์</button>
      <FeedbackDialog
        open={open}
        tone="success"
        title="บันทึกสำเร็จ"
        message="ระบบบันทึกข้อมูลแล้ว"
        onClose={() => setOpen(false)}
      />
    </>
  )
}

describe('FeedbackDialog', () => {
  it('moves focus inside, traps Tab, closes on Escape, and restores focus', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)

    const trigger = screen.getByRole('button', { name: 'เปิดผลลัพธ์' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'บันทึกสำเร็จ' })
    const confirm = screen.getByRole('button', { name: 'ตกลง' })
    const close = screen.getByRole('button', { name: 'ปิด popup' })
    expect(dialog).toHaveAttribute('aria-describedby')
    expect(confirm).toHaveFocus()
    expect(close).toHaveClass('h-11', 'w-11')

    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
