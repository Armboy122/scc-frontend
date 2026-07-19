import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StockSummary } from '@/lib/types'
import StockPage from './page'

const { useStockMock } = vi.hoisted(() => ({
  useStockMock: vi.fn(),
}))

vi.mock('@/hooks/useStock', () => ({
  useStock: useStockMock,
}))

const reconciledStock: StockSummary = {
  officeId: 'office-1',
  office: { id: 'office-1', name: 'Office One', workHubId: 'hub-1' },
  inStock: 10,
  reservedPlanned: 3,
  reservedBorrow: 1,
  availableForWorkOrder: 6,
  installed: 4,
  onLoanOut: 2,
  onLoanIn: 1,
  total: 14,
}

describe('StockPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStockMock.mockReturnValue({
      data: [reconciledStock],
      isLoading: false,
      error: null,
    })
  })

  it('renders available capacity after both planned and borrow reservations', () => {
    render(<StockPage />)

    const officeRow = screen.getByRole('row', { name: /Office One/ })
    expect(within(officeRow).getByText('6')).toBeInTheDocument()
    expect(within(officeRow).getByText('10')).toBeInTheDocument()
    expect(screen.getByText('ในคลังจริง 10 · กันใบงาน 3 · กันให้ยืม 1')).toBeInTheDocument()
  })

  it('renders explicit loading, error, and empty states', () => {
    useStockMock.mockReturnValueOnce({ data: undefined, isLoading: true, error: null })
    const { rerender } = render(<StockPage />)
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(4)

    useStockMock.mockReturnValueOnce({ data: undefined, isLoading: false, error: new Error('failed') })
    rerender(<StockPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('ไม่สามารถโหลดข้อมูลได้')

    useStockMock.mockReturnValue({ data: [], isLoading: false, error: null })
    rerender(<StockPage />)
    expect(screen.getByText('ยังไม่มีข้อมูลสต็อก')).toBeInTheDocument()
  })

  it('uses an alert tone when no stock is available for a work order', () => {
    useStockMock.mockReturnValue({
      data: [{ ...reconciledStock, availableForWorkOrder: 0 }],
      isLoading: false,
      error: null,
    })

    render(<StockPage />)

    expect(screen.getAllByText('0')[0]).toHaveClass('text-red-700')
  })
})
