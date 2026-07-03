import { CameraOff } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface EvidencePhotoNoticeProps {
  flow: 'install' | 'remove'
}

export function EvidencePhotoNotice({ flow }: EvidencePhotoNoticeProps) {
  const copy = flow === 'install'
    ? {
        title: 'รูปหลักฐานติดตั้งยังไม่เปิดใช้งาน',
        body: 'ระบบยังไม่มี storage upload จริง จึงซ่อนปุ่มถ่ายรูปไว้ก่อนเพื่อไม่ให้ช่างถ่ายแล้วรูปหายเงียบ ๆ',
      }
    : {
        title: 'รูปหลักฐานถอดยังไม่เปิดใช้งาน',
        body: 'ตาม spec ต้องมีรูปถ่ายก่อนปิดงาน แต่รอบนี้ระบบยังไม่มี storage upload จริง จึงยังไม่บังคับถ่ายรูปจนกว่าจะต่อ upload ให้ครบ',
      }

  return (
    <Card className="border-amber-200 bg-amber-50" padding="sm">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700">
          <CameraOff className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-amber-950">{copy.title}</h2>
          <p className="mt-1 text-sm leading-6 text-amber-800">{copy.body}</p>
        </div>
      </div>
    </Card>
  )
}
