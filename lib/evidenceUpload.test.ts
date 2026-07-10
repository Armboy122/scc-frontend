import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { matchCoverByCode, uploadEvidencePhoto } from './evidenceUpload'
import type { Cover } from './types'

vi.mock('./api', () => ({
  api: {
    post: vi.fn(),
  },
}))

const cover: Cover = {
  id: 'cover-1',
  assetCode: 'PEA-001',
  qrCode: 'SCC:office-1:PEA-001',
  nfcId: 'nfc-1',
  status: 'IN_STOCK',
  ownerOfficeId: 'office-1',
  currentOfficeId: 'office-1',
  createdAt: '2026-07-04T00:00:00Z',
  updatedAt: '2026-07-04T00:00:00Z',
}

describe('matchCoverByCode', () => {
  it('matches id, asset code, QR code, or NFC id', () => {
    expect(matchCoverByCode([cover], 'cover-1')?.id).toBe('cover-1')
    expect(matchCoverByCode([cover], 'PEA-001')?.id).toBe('cover-1')
    expect(matchCoverByCode([cover], 'SCC:office-1:PEA-001')?.id).toBe('cover-1')
    expect(matchCoverByCode([cover], 'nfc-1')?.id).toBe('cover-1')
  })
})

describe('uploadEvidencePhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('presigns, immutably PUTs, and attaches one exact object key per installation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(api.post).mockImplementation(async (path: string, body?: unknown) => {
      if (path === '/uploads/presign') {
        const coverId = (body as { coverId: string }).coverId
        return {
          data: {
            uploadUrl: `https://minio.example/upload/${coverId}`,
            objectKey: `evidence/v1/install/wo-1/${coverId}/opaque.jpg`,
          },
          error: null,
        }
      }
      return { data: null, error: null }
    })

    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })

    const objectKey = await uploadEvidencePhoto({
      kind: 'install',
      workOrderId: 'wo-1',
      coverIds: ['cover-1', 'cover-2', 'cover-1'],
      file,
    })

    expect(objectKey).toBe('evidence/v1/install/wo-1/cover-1/opaque.jpg')
    expect(api.post).toHaveBeenCalledWith('/uploads/presign', {
      kind: 'install',
      workOrderId: 'wo-1',
      coverId: 'cover-1',
      contentType: 'image/jpeg',
      size: file.size,
    })
    expect(api.post).toHaveBeenCalledWith('/uploads/presign', {
      kind: 'install',
      workOrderId: 'wo-1',
      coverId: 'cover-2',
      contentType: 'image/jpeg',
      size: file.size,
    })
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://minio.example/upload/cover-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg', 'If-None-Match': '*' },
      body: file,
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://minio.example/upload/cover-2', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg', 'If-None-Match': '*' },
      body: file,
    })
    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/installations/cover-1/photo', {
      objectKey: 'evidence/v1/install/wo-1/cover-1/opaque.jpg',
    })
    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/installations/cover-2/photo', {
      objectKey: 'evidence/v1/install/wo-1/cover-2/opaque.jpg',
    })
  })

  it('fails without attaching if MinIO PUT fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        uploadUrl: 'https://minio.example/upload',
        objectKey: 'evidence/v1/remove/wo-1/cover-1/opaque.jpg',
      },
      error: null,
    })

    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })

    await expect(uploadEvidencePhoto({
      kind: 'remove',
      workOrderId: 'wo-1',
      coverIds: ['cover-1'],
      file,
    })).rejects.toThrow('อัปโหลดรูปหลักฐานไป MinIO ไม่สำเร็จ')
    expect(api.post).not.toHaveBeenCalledWith(
      '/workorders/wo-1/installations/cover-1/photo-remove',
      expect.anything(),
    )
  })

  it('rejects unsupported, empty, and oversized files before requesting a signed URL', async () => {
    for (const file of [
      new File(['<svg/>'], 'active.svg', { type: 'image/svg+xml' }),
      new File(['unknown'], 'unknown.bin'),
      new File([], 'empty.jpg', { type: 'image/jpeg' }),
      { name: 'large.jpg', type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 } as File,
    ]) {
      await expect(uploadEvidencePhoto({
        kind: 'install',
        workOrderId: 'wo-1',
        coverIds: ['cover-1'],
        file,
      })).rejects.toThrow()
    }
    expect(api.post).not.toHaveBeenCalled()
  })

  it('requires the server to return an opaque object key', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { uploadUrl: 'https://minio.example/upload', objectKey: '' },
      error: null,
    })
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })

    await expect(uploadEvidencePhoto({
      kind: 'install',
      workOrderId: 'wo-1',
      coverIds: ['cover-1'],
      file,
    })).rejects.toThrow('ไม่สามารถขอ URL สำหรับอัปโหลดรูปได้')
  })
})
