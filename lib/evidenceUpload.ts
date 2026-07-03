import { api } from './api'
import type { Cover } from './types'

export type EvidenceKind = 'install' | 'remove'

interface PresignUploadResponse {
  uploadUrl: string
  fileUrl: string
}

interface UploadEvidencePhotoParams {
  kind: EvidenceKind
  workOrderId: string
  coverIds: string[]
  file: File
}

const photoEndpoint: Record<EvidenceKind, (workOrderId: string, coverId: string) => string> = {
  install: (workOrderId, coverId) => `/workorders/${workOrderId}/installations/${coverId}/photo`,
  remove: (workOrderId, coverId) => `/workorders/${workOrderId}/installations/${coverId}/photo-remove`,
}

export function matchCoverByCode(covers: Cover[] | undefined, code: string): Cover | undefined {
  const normalized = code.trim()
  return covers?.find((cover) =>
    cover.id === normalized ||
    cover.assetCode === normalized ||
    cover.qrCode === normalized ||
    cover.nfcId === normalized,
  )
}

export async function uploadEvidencePhoto({
  kind,
  workOrderId,
  coverIds,
  file,
}: UploadEvidencePhotoParams): Promise<string> {
  const uniqueCoverIds = Array.from(new Set(coverIds.filter(Boolean)))
  if (uniqueCoverIds.length === 0) {
    throw new Error('ไม่พบรายการฉนวนสำหรับผูกรูปหลักฐาน')
  }

  const presign = await api.post<PresignUploadResponse>('/uploads/presign', {
    kind,
    workOrderId,
    coverId: uniqueCoverIds[0],
  })

  if (!presign.data?.uploadUrl || !presign.data.fileUrl) {
    throw new Error('ไม่สามารถขอ URL สำหรับอัปโหลดรูปได้')
  }

  const uploadRes = await fetch(presign.data.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'image/jpeg',
    },
    body: file,
  })

  if (!uploadRes.ok) {
    throw new Error('อัปโหลดรูปหลักฐานไป MinIO ไม่สำเร็จ')
  }

  await Promise.all(uniqueCoverIds.map((coverId) =>
    api.post(photoEndpoint[kind](workOrderId, coverId), { fileUrl: presign.data!.fileUrl }),
  ))

  return presign.data.fileUrl
}
