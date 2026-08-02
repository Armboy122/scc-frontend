import type { Cover, Installation, WorkOrder, WorkOrderStatus } from './types'

export type CoverMapPriority = 'OVERDUE' | 'DUE_SOON' | 'NORMAL' | 'REMOVING'
export type CoverMapKind = 'ACTIVE' | 'HISTORY'

export interface CoverMapSite {
  id: string
  kind: CoverMapKind
  workOrderId: string
  customerName: string
  requestNumber?: string
  officeName: string
  latitude: number
  longitude: number
  removalDate?: string
  installedAt?: string
  removedAt?: string
  status: WorkOrderStatus
  priority: CoverMapPriority
  covers: Array<{ id: string; assetCode: string }>
}

function validCoordinate(latitude?: number, longitude?: number): latitude is number {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && (latitude as number) >= -90 && (latitude as number) <= 90
    && (longitude as number) >= -180 && (longitude as number) <= 180
}

export function getCoverMapPriority(
  order: Pick<WorkOrder, 'status' | 'removalDate'>,
  now = new Date(),
): CoverMapPriority {
  if (order.status === 'REMOVING') return 'REMOVING'
  if (order.status === 'REMOVAL_DUE') return 'OVERDUE'
  if (!order.removalDate) return 'NORMAL'

  const removalTime = new Date(order.removalDate).getTime()
  if (!Number.isFinite(removalTime)) return 'NORMAL'
  if (removalTime < now.getTime()) return 'OVERDUE'
  if (removalTime - now.getTime() <= 3 * 24 * 60 * 60 * 1000) return 'DUE_SOON'
  return 'NORMAL'
}

function installationCoordinate(installation: Installation, order: WorkOrder) {
  const latitude = installation.gpsLat ?? order.latitude ?? order.gpsLat
  const longitude = installation.gpsLng ?? order.longitude ?? order.gpsLng
  return validCoordinate(latitude, longitude) ? { latitude, longitude: longitude as number } : undefined
}

export function buildCoverMapSites(
  workOrders: WorkOrder[],
  covers: Cover[],
  now = new Date(),
): CoverMapSite[] {
  const coverById = new Map(covers.map((cover) => [cover.id, cover]))
  const sites: CoverMapSite[] = []

  for (const order of workOrders) {
    if (!['ACTIVE', 'REMOVAL_DUE', 'REMOVING'].includes(order.status)) continue

    const activeInstallations = (order.installations ?? []).filter(
      (installation) => Boolean(installation.installedAt) && !installation.removedAt,
    )
    const grouped = new Map<string, { latitude: number; longitude: number; installations: Installation[] }>()

    for (const installation of activeInstallations) {
      const coordinate = installationCoordinate(installation, order)
      if (!coordinate) continue
      const key = `${coordinate.latitude.toFixed(6)},${coordinate.longitude.toFixed(6)}`
      const group = grouped.get(key) ?? { ...coordinate, installations: [] }
      group.installations.push(installation)
      grouped.set(key, group)
    }

    for (const [coordinateKey, group] of grouped) {
      sites.push({
        id: `${order.id}:${coordinateKey}`,
        kind: 'ACTIVE',
        workOrderId: order.id,
        customerName: order.customerName,
        requestNumber: order.requestNumber,
        officeName: order.office?.name ?? 'ไม่ระบุสำนักงาน',
        latitude: group.latitude,
        longitude: group.longitude,
        removalDate: order.removalDate,
        status: order.status,
        priority: getCoverMapPriority(order, now),
        installedAt: group.installations
          .map((installation) => installation.installedAt)
          .filter((value): value is string => Boolean(value))
          .toSorted()[0],
        covers: group.installations.map((installation) => ({
          id: installation.coverId,
          assetCode: coverById.get(installation.coverId)?.assetCode ?? installation.coverId,
        })),
      })
    }
  }

  const rank: Record<CoverMapPriority, number> = { OVERDUE: 0, REMOVING: 1, DUE_SOON: 2, NORMAL: 3 }
  return sites.toSorted((a, b) =>
    rank[a.priority] - rank[b.priority]
    || (a.removalDate ?? '').localeCompare(b.removalDate ?? '')
    || a.customerName.localeCompare(b.customerName, 'th'),
  )
}

export function buildCoverMapHistorySites(
  workOrders: WorkOrder[],
  covers: Cover[],
): CoverMapSite[] {
  const coverById = new Map(covers.map((cover) => [cover.id, cover]))
  const sites: CoverMapSite[] = []

  for (const order of workOrders) {
    if (order.status !== 'COMPLETED') continue

    const removedInstallations = (order.installations ?? []).filter(
      (installation) => Boolean(installation.installedAt) && Boolean(installation.removedAt),
    )
    const grouped = new Map<string, { latitude: number; longitude: number; installations: Installation[] }>()

    for (const installation of removedInstallations) {
      const coordinate = installationCoordinate(installation, order)
      if (!coordinate) continue
      const key = `${coordinate.latitude.toFixed(6)},${coordinate.longitude.toFixed(6)}`
      const group = grouped.get(key) ?? { ...coordinate, installations: [] }
      group.installations.push(installation)
      grouped.set(key, group)
    }

    for (const [coordinateKey, group] of grouped) {
      const installedAt = group.installations
        .map((installation) => installation.installedAt)
        .filter((value): value is string => Boolean(value))
        .toSorted()[0]
      const removedAt = group.installations
        .map((installation) => installation.removedAt)
        .filter((value): value is string => Boolean(value))
        .toSorted()
        .at(-1)

      sites.push({
        id: `${order.id}:history:${coordinateKey}`,
        kind: 'HISTORY',
        workOrderId: order.id,
        customerName: order.customerName,
        requestNumber: order.requestNumber,
        officeName: order.office?.name ?? 'ไม่ระบุสำนักงาน',
        latitude: group.latitude,
        longitude: group.longitude,
        removalDate: order.removalDate,
        installedAt,
        removedAt,
        status: order.status,
        priority: 'NORMAL',
        covers: group.installations.map((installation) => ({
          id: installation.coverId,
          assetCode: coverById.get(installation.coverId)?.assetCode ?? installation.coverId,
        })),
      })
    }
  }

  return sites.toSorted((a, b) =>
    (b.removedAt ?? '').localeCompare(a.removedAt ?? '')
    || a.customerName.localeCompare(b.customerName, 'th'),
  )
}

export function countCompletedWorkOrdersWithoutMapCoordinates(workOrders: WorkOrder[]): number {
  return workOrders.filter((order) => {
    if (order.status !== 'COMPLETED') return false
    const completedInstallations = (order.installations ?? []).filter(
      (installation) => Boolean(installation.installedAt) && Boolean(installation.removedAt),
    )
    return completedInstallations.length > 0
      && completedInstallations.every((installation) => !installationCoordinate(installation, order))
  }).length
}

export function createGoogleMapsDirectionsUrl(sites: CoverMapSite[]): string {
  if (sites.length === 0) return ''
  const coordinates = sites.map((site) => `${site.latitude},${site.longitude}`)
  const params = new URLSearchParams({
    api: '1',
    destination: coordinates.at(-1) as string,
    travelmode: 'driving',
  })
  if (coordinates.length > 1) params.set('waypoints', coordinates.slice(0, -1).join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
