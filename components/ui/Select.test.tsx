import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Select } from './Select'

describe('Select', () => {
  it('associates hint text with the select control', () => {
    render(
      <Select
        label="สำนักงาน"
        hint="เลือกสำนักงานเจ้าของข้อมูล"
        options={[{ value: 'office-1', label: 'สำนักงาน 1' }]}
      />,
    )

    const select = screen.getByRole('combobox', { name: 'สำนักงาน' })
    const hint = screen.getByText('เลือกสำนักงานเจ้าของข้อมูล')
    expect(hint).toHaveAttribute('id')
    expect(select).toHaveAttribute('aria-describedby', hint.id)
  })

  it('prioritizes an error description over a hint', () => {
    render(
      <Select
        label="สำนักงาน"
        hint="เลือกสำนักงานเจ้าของข้อมูล"
        error="กรุณาเลือกสำนักงาน"
        options={[]}
      />,
    )

    const select = screen.getByRole('combobox', { name: 'สำนักงาน' })
    const error = screen.getByRole('alert')
    expect(select).toHaveAttribute('aria-describedby', error.id)
    expect(screen.queryByText('เลือกสำนักงานเจ้าของข้อมูล')).not.toBeInTheDocument()
  })
})
