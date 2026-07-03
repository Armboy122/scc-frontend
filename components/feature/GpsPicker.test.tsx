import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GpsPicker, type GpsCoords } from './GpsPicker'

function StatefulGpsPicker({ onChange }: { onChange: (coords: GpsCoords | null) => void }) {
  const [value, setValue] = useState<GpsCoords | null>(null)
  return (
    <GpsPicker
      value={value}
      onChange={(coords) => {
        setValue(coords)
        onChange(coords)
      }}
    />
  )
}

describe('GpsPicker', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('searches a tambon and pins the selected result', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            place_id: 1,
            display_name: 'ตำบลบางรัก, อำเภอเมือง, จังหวัดตรัง, ประเทศไทย',
            lat: '7.563100',
            lon: '99.611400',
          },
        ],
      }),
    )

    render(<StatefulGpsPicker onChange={onChange} />)

    await user.type(screen.getByLabelText('ค้นหาตำบลหรือสถานที่'), 'ตำบลบางรัก ตรัง')
    await user.click(screen.getByRole('button', { name: /ค้นหา/ }))
    await user.click(await screen.findByText('เลือกปักหมุดนี้'))

    expect(onChange).toHaveBeenCalledWith({ latitude: 7.5631, longitude: 99.6114 })
    expect(screen.getByText('7.563100, 99.611400')).toBeInTheDocument()
  })

  it('pins manually entered coordinates', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<StatefulGpsPicker onChange={onChange} />)

    await user.type(screen.getByLabelText('ละติจูด'), '13.7563')
    await user.type(screen.getByLabelText('ลองจิจูด'), '100.5018')
    await user.click(screen.getByRole('button', { name: 'ปักหมุดจากพิกัดที่กรอก' }))

    expect(onChange).toHaveBeenCalledWith({ latitude: 13.7563, longitude: 100.5018 })
  })

  it('shows an error when manual coordinates are invalid', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<StatefulGpsPicker onChange={onChange} />)

    await user.type(screen.getByLabelText('ละติจูด'), '999')
    await user.type(screen.getByLabelText('ลองจิจูด'), '100')
    await user.click(screen.getByRole('button', { name: 'ปักหมุดจากพิกัดที่กรอก' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('พิกัดอยู่นอกช่วงที่ถูกต้อง')
    })
    expect(onChange).not.toHaveBeenCalled()
  })
})
