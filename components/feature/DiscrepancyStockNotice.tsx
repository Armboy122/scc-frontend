import { ShieldAlert } from 'lucide-react'

export function DiscrepancyStockNotice() {
  return (
    <aside className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3" aria-label="ผลต่อสต็อก">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <ShieldAlert className="h-4 w-4 text-amber-700" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-amber-950">เป็นบันทึกตรวจสอบเท่านั้น</p>
          <p className="mt-0.5 text-sm leading-6 text-amber-900">
            การรายงานหรือปิดเรื่องนี้ไม่เปลี่ยนสต็อก สถานะฉนวน สำนักงาน ใบงาน หรือใบยืม
            หากต้องแก้ข้อมูลจริง ต้องดำเนินการผ่านกระบวนการหลักของรายการนั้น
          </p>
        </div>
      </div>
    </aside>
  )
}
