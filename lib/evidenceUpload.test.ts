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
  })

  it('presigns, PUTs to MinIO, and stores the returned file URL on every installation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(api.post).mockImplementation(async (path: string) => {
      if (path === '/uploads/presign') {
        return {
          data: {
            uploadUrl: 'https://minio.example/upload',
            fileUrl: 'https://storage.example/scc/install/wo-1/cover-1/photo.jpg',
          },
          error: null,
        }
      }
      return { data: null, error: null }
    })

    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })

    const fileUrl = await uploadEvidencePhoto({
      kind: 'install',
      workOrderId: 'wo-1',
      coverIds: ['cover-1', 'cover-2'],
      file,
    })

    expect(fileUrl).toBe('https://storage.example/scc/install/wo-1/cover-1/photo.jpg')
    expect(api.post).toHaveBeenCalledWith('/uploads/presign', {
      kind: 'install',
      workOrderId: 'wo-1',
      coverId: 'cover-1',
    })
    expect(fetchMock).toHaveBeenCalledWith('https://minio.example/upload', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: file,
    })
    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/installations/cover-1/photo', {
      fileUrl: 'https://storage.example/scc/install/wo-1/cover-1/photo.jpg',
    })
    expect(api.post).toHaveBeenCalledWith('/workorders/wo-1/installations/cover-2/photo', {
      fileUrl: 'https://storage.example/scc/install/wo-1/cover-1/photo.jpg',
    })
  })

  it('fails if MinIO PUT fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        uploadUrl: 'https://minio.example/upload',
        fileUrl: 'https://storage.example/photo.jpg',
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
  })
})
