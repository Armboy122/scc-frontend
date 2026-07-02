import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders an enabled button and handles clicks', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(createElement(Button, { onClick }, 'บันทึก'))

    const button = screen.getByRole('button', { name: 'บันทึก' })
    expect(button).toBeEnabled()

    await user.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('marks loading buttons as disabled', () => {
    render(createElement(Button, { loading: true }, 'กำลังบันทึก'))

    const button = screen.getByRole('button', { name: 'กำลังบันทึก' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })
})
