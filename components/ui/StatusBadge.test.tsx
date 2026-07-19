import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('uses the unambiguous removal label and high-contrast status text', () => {
    render(<StatusBadge status="REMOVING" />)

    const badge = screen.getByText('กำลังถอด')
    expect(badge).toHaveClass('text-violet-800')
  })

  it('uses high-contrast colors for active and due statuses', () => {
    const { rerender } = render(<StatusBadge status="ACTIVE" />)
    expect(screen.getByText('ติดตั้ง')).toHaveClass('text-green-800')

    rerender(<StatusBadge status="REMOVAL_DUE" />)
    expect(screen.getByText('ครบกำหนด')).toHaveClass('text-orange-800')
  })
})
