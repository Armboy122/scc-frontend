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
    vi.unstubAllGlobals()
  })

  it('searches through the location API proxy and pins the selected result', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            label: 'ตำบลบางรัก, อำเภอเมือง, จังหวัดตรัง',
            latitude: 7.5631,
            longitude: 99.6114,
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<StatefulGpsPicker onChange={onChange} />)

    await user.type(screen.getByLabelText('ค้นหาสถานที่'), 'ตำบลบางรัก ตรัง')
    await user.click(screen.getByRole('button', { name: /ค้นหา/ }))
    await user.click(await screen.findByRole('button', { name: /ตำบลบางรัก/ }))

    expect(fetchMock).toHaveBeenCalledWith('/api/location?mode=search&q=%E0%B8%95%E0%B8%B3%E0%B8%9A%E0%B8%A5%E0%B8%9A%E0%B8%B2%E0%B8%87%E0%B8%A3%E0%B8%B1%E0%B8%81%20%E0%B8%95%E0%B8%A3%E0%B8%B1%E0%B8%87')
    expect(onChange).toHaveBeenCalledWith({
      latitude: 7.5631,
      longitude: 99.6114,
      label: 'ตำบลบางรัก, อำเภอเมือง, จังหวัดตรัง',
    })
    expect(screen.getByText('7.563100')).toBeInTheDocument()
    expect(screen.getByText('99.611400')).toBeInTheDocument()
  })

  it('keeps manual coordinate entry as a fallback', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<StatefulGpsPicker onChange={onChange} />)

    await user.click(screen.getByText('กรอกพิกัดเอง ถ้าแผนที่/GPS ใช้ไม่ได้'))
    await user.type(screen.getByLabelText('ละติจูด'), '13.7563')
    await user.type(screen.getByLabelText('ลองจิจูด'), '100.5018')
    await user.click(screen.getByRole('button', { name: 'ปักหมุดจากพิกัดที่กรอก' }))

    expect(onChange).toHaveBeenCalledWith({ latitude: 13.7563, longitude: 100.5018 })
  })

  it('shows an error when manual coordinates are invalid', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<StatefulGpsPicker onChange={onChange} />)

    await user.click(screen.getByText('กรอกพิกัดเอง ถ้าแผนที่/GPS ใช้ไม่ได้'))
    await user.type(screen.getByLabelText('ละติจูด'), '999')
    await user.type(screen.getByLabelText('ลองจิจูด'), '100')
    await user.click(screen.getByRole('button', { name: 'ปักหมุดจากพิกัดที่กรอก' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('พิกัดอยู่นอกช่วงที่ถูกต้อง')
    })
    expect(onChange).not.toHaveBeenCalled()
  })
})
