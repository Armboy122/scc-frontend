import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportsPage from './page'

const { apiDownloadMock, useAuthMock, useOfficesMock, useReportSummaryMock } = vi.hoisted(() => ({
  apiDownloadMock: vi.fn(),
  useAuthMock: vi.fn(),
  useOfficesMock: vi.fn(),
  useReportSummaryMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useOffices', () => ({ useOffices: useOfficesMock }))
vi.mock('@/hooks/useAdmin', () => ({ useReportSummary: useReportSummaryMock }))
vi.mock('@/lib/api', () => ({ api: { download: apiDownloadMock } }))
vi.mock('@/lib/thaiDate', () => ({ currentBangkokGregorianYear: () => 2026 }))

describe('ReportsPage revenue year', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({ user: { id: 'admin-1', role: 'admin' } })
    useOfficesMock.mockReturnValue({ data: [{ id: 'office-62', name: 'กฟส.หาดใหญ่' }] })
    useReportSummaryMock.mockReturnValue({
      data: {
        year: 2026,
        totalCovers: 24,
        installedCovers: 0,
        utilization: 0,
        activeWorkOrders: 0,
        completedRevenueIncludingVatSatang: 6623300,
        usageByType: { CUSTOMER_COVER: 0, INTERNAL: 0 },
        byOffice: [{
          office: { id: 'office-62', name: 'กฟส.หาดใหญ่' },
          total: 24,
          installed: 0,
          inStock: 24,
          utilization: 0,
          completedRevenueIncludingVatSatang: 6623300,
        }],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    apiDownloadMock.mockResolvedValue(new Blob(['csv'], { type: 'text/csv' }))
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:report') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('requests the current Gregorian year but presents Buddhist year and exact revenue', () => {
    render(<ReportsPage />)

    expect(useReportSummaryMock).toHaveBeenCalledWith(undefined, 2026, true)
    expect(screen.getByText('รายได้รวม VAT ปี 2569')).toBeInTheDocument()
    expect(screen.getAllByText(/66,233\.00 บาท/)).toHaveLength(2)
    expect(screen.getByRole('combobox', { name: 'ปีรายงาน' })).toHaveValue('2026')
    expect(screen.getByRole('option', { name: 'พ.ศ. 2569' })).toBeInTheDocument()
  })

  it('passes the selected Gregorian year and office to CSV export', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'สำนักงาน' }), 'office-62')
    await user.click(screen.getByRole('button', { name: 'ดาวน์โหลด CSV' }))

    expect(apiDownloadMock).toHaveBeenCalledWith('/reports/export.csv?year=2026&officeId=office-62')
  })
})
