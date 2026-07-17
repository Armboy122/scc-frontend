import { describe, expect, it } from 'vitest'
import { getCoverAlerts, getCoverContextLabels } from './coverPresentation'

const now = new Date('2026-07-11T10:00:00+07:00')
const base = { status: 'INSTALLED' as const, ownerOfficeId: 'songkhla', currentOfficeId: 'hatyai' }

describe('cover presentation', () => {
  it('keeps physical status separate from borrowed custody and shows both deadlines', () => {
    expect(getCoverContextLabels(base)).toEqual(['ติดตั้งอยู่', 'ยืมอยู่'])
    expect(getCoverAlerts({ ...base, activeBorrow: { status: 'ON_LOAN', returnDate: '2026-07-12T09:00:00+07:00' }, activeWorkOrder: { status: 'ACTIVE', removalDate: '2026-07-13T09:00:00+07:00' } }, now)).toEqual(['REMOVAL_DUE_SOON', 'RETURN_DUE_SOON'])
  })

  it('does not show deadline alerts for completed work and distinguishes overdue return', () => {
    expect(getCoverAlerts({ ...base, activeBorrow: { status: 'OVERDUE', returnDate: '2026-07-10T09:00:00+07:00' }, activeWorkOrder: { status: 'COMPLETED', removalDate: '2026-07-10T09:00:00+07:00' } }, now)).toEqual(['RETURN_OVERDUE'])
  })
})
