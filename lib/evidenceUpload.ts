import { api } from './api'
import type { Cover } from './types'

export type EvidenceKind = 'install' | 'remove'

interface PresignUploadResponse {
  uploadUrl: string
  objectKey: string
}

interface UploadEvidencePhotoParams {
  kind: EvidenceKind
  workOrderId: string
  coverIds: string[]
  file: File
}

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

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

function evidenceContentType(file: File): string {
  const contentType = file.type.split(';', 1)[0].trim().toLowerCase()
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error('รูปหลักฐานต้องเป็น JPEG, PNG หรือ WebP เท่านั้น')
  }
  if (file.size <= 0) {
    throw new Error('ไฟล์รูปหลักฐานว่างเปล่า')
  }
  if (file.size > MAX_EVIDENCE_BYTES) {
    throw new Error('รูปหลักฐานต้องมีขนาดไม่เกิน 10 MiB')
  }
  return contentType
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
  const contentType = evidenceContentType(file)
  const attachedObjectKeys: string[] = []

  // One photo may document a batch, but every installation receives its own
  // relation-scoped immutable object key. Sequential writes make partial
  // progress safe to retry without rescanning persisted install/removal state.
  for (const coverId of uniqueCoverIds) {
    const presign = await api.post<PresignUploadResponse>('/uploads/presign', {
      kind,
      workOrderId,
      coverId,
      contentType,
      size: file.size,
    })

    if (!presign.data?.uploadUrl || !presign.data.objectKey) {
      throw new Error('ไม่สามารถขอ URL สำหรับอัปโหลดรูปได้')
    }

    const uploadRes = await fetch(presign.data.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'If-None-Match': '*',
      },
      body: file,
    })

    if (!uploadRes.ok) {
      throw new Error('อัปโหลดรูปหลักฐานไป MinIO ไม่สำเร็จ')
    }

    await api.post(photoEndpoint[kind](workOrderId, coverId), {
      objectKey: presign.data.objectKey,
    })
    attachedObjectKeys.push(presign.data.objectKey)
  }

  return attachedObjectKeys[0]
}
