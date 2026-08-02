import { describe, expect, it } from 'vitest'
import {
  buildCoverMapHistorySites,
  buildCoverMapSites,
  countCompletedWorkOrdersWithoutMapCoordinates,
  createGoogleMapsDirectionsUrl,
  getCoverMapPriority,
} from './coverMap'
import type { Cover, WorkOrder } from './types'

const cover: Cover = {
  id: 'cover-1',
  assetCode: 'PEA-001',
  qrCode: 'QR-001',
  status: 'INSTALLED',
  ownerOfficeId: 'office-1',
  currentOfficeId: 'office-1',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
}

const order: WorkOrder = {
  id: 'wo-1',
  status: 'ACTIVE',
  customerName: 'สถานีทดสอบ',
  requestNumber: 'REQ-001',
  removalDate: '2026-07-26T00:00:00Z',
  plannedQty: 1,
  gpsLat: 7.2,
  gpsLng: 100.6,
  officeId: 'office-1',
  installations: [{
    id: 'installation-1',
    workOrderId: 'wo-1',
    coverId: 'cover-1',
    installedAt: '2026-07-20T00:00:00Z',
    createdAt: '2026-07-20T00:00:00Z',
  }],
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
}

describe('cover map projection', () => {
  it('projects only active, installed and geocoded covers', () => {
    const sites = buildCoverMapSites([order], [cover], new Date('2026-07-24T00:00:00Z'))
    expect(sites).toHaveLength(1)
    expect(sites[0]).toMatchObject({
      kind: 'ACTIVE',
      workOrderId: 'wo-1',
      latitude: 7.2,
      longitude: 100.6,
      priority: 'DUE_SOON',
      covers: [{ id: 'cover-1', assetCode: 'PEA-001' }],
    })
  })

  it('does not show removed installation history', () => {
    const removed = {
      ...order,
      installations: order.installations?.map((installation) => ({
        ...installation,
        removedAt: '2026-07-23T00:00:00Z',
      })),
    }
    expect(buildCoverMapSites([removed], [cover])).toEqual([])
  })

  it('projects completed removals as installation history', () => {
    const completed: WorkOrder = {
      ...order,
      status: 'COMPLETED',
      installations: order.installations?.map((installation) => ({
        ...installation,
        removedAt: '2026-07-23T00:00:00Z',
      })),
    }

    expect(buildCoverMapHistorySites([completed], [cover])).toEqual([
      expect.objectContaining({
        kind: 'HISTORY',
        workOrderId: 'wo-1',
        installedAt: '2026-07-20T00:00:00Z',
        removedAt: '2026-07-23T00:00:00Z',
        covers: [{ id: 'cover-1', assetCode: 'PEA-001' }],
      }),
    ])
  })

  it('counts completed work orders whose installation history has no coordinates', () => {
    const completedWithoutCoordinates: WorkOrder = {
      ...order,
      status: 'COMPLETED',
      gpsLat: undefined,
      gpsLng: undefined,
      installations: order.installations?.map((installation) => ({
        ...installation,
        removedAt: '2026-07-23T00:00:00Z',
      })),
    }

    expect(countCompletedWorkOrdersWithoutMapCoordinates([completedWithoutCoordinates])).toBe(1)
  })

  it('prioritises an explicit removal workflow', () => {
    expect(getCoverMapPriority({ status: 'REMOVING', removalDate: undefined })).toBe('REMOVING')
  })

  it('builds a multi-stop driving route', () => {
    const sites = buildCoverMapSites([
      order,
      { ...order, id: 'wo-2', gpsLat: 7.3, gpsLng: 100.7 },
    ], [cover])
    const url = createGoogleMapsDirectionsUrl(sites)
    expect(url).toContain('travelmode=driving')
    expect(url).toContain('waypoints=')
  })
})
