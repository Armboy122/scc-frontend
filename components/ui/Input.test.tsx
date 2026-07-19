import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('creates unique IDs for unlabeled inputs while preserving an accessible name', () => {
    render(
      <>
        <Input aria-label="ค้นหารายการฉนวน" />
        <Input aria-label="ค้นหาเลขที่ใบงาน" />
      </>,
    )

    const coverSearch = screen.getByRole('textbox', { name: 'ค้นหารายการฉนวน' })
    const workOrderSearch = screen.getByRole('textbox', { name: 'ค้นหาเลขที่ใบงาน' })
    expect(coverSearch.id).toBeTruthy()
    expect(coverSearch.id).not.toBe(workOrderSearch.id)
  })
})
