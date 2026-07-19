import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PhotoCapture } from './PhotoCapture'

describe('PhotoCapture device contract', () => {
  it('asks mobile browsers for the rear camera while retaining image-file fallback', () => {
    render(<PhotoCapture onChange={vi.fn()} />)
    const input = screen.getByLabelText('ถ่ายภาพประกอบ')
    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).toHaveAttribute('capture', 'environment')
  })
})
