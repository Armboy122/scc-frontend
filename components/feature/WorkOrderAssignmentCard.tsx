'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, UserMinus, UserRoundCheck, Users } from 'lucide-react'
import { useTechnicians } from '@/hooks/useTechnicians'
import { useAssignWorkOrder, useUnassignWorkOrder } from '@/hooks/useWorkOrders'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Role, WorkOrder, WorkOrderStatus } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'

export function canManageWorkOrderAssignment(role: Role | undefined): boolean {
  return role === 'admin' || role === 'exec'
}

const ASSIGNABLE_STATUSES = new Set<WorkOrderStatus>([
  'SCHEDULED',
  'ACTIVE',
  'REMOVAL_DUE',
  'REMOVING',
])

export function canAssignWorkOrder(order: WorkOrder): boolean {
  return ASSIGNABLE_STATUSES.has(order.status)
}

export function canUnassignWorkOrder(order: WorkOrder): boolean {
  return order.status === 'SCHEDULED' && Boolean(order.assignedToId)
}

function mutationErrorMessage(error: unknown): string | null {
  if (!error) return null
  if (error instanceof ApiError) return error.message
  return 'บันทึกผู้รับผิดชอบไม่สำเร็จ กรุณาลองใหม่'
}

export function WorkOrderAssignmentCard({ order }: { order: WorkOrder }) {
  const { user } = useAuth()
  const canManage = canManageWorkOrderAssignment(user?.role)
  const canAssign = canAssignWorkOrder(order)
  const techniciansQuery = useTechnicians(order.officeId, canManage && canAssign)
  const assignMutation = useAssignWorkOrder()
  const unassignMutation = useUnassignWorkOrder()
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(order.assignedToId ?? '')
  const [confirmUnassign, setConfirmUnassign] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setSelectedTechnicianId(order.assignedToId ?? '')
    setConfirmUnassign(false)
  }, [order.assignedToId])

  const options = useMemo(() => {
    const available = (techniciansQuery.data ?? []).map((technician) => ({
      value: technician.id,
      label: technician.name,
    }))
    if (order.assignedToId && !available.some((option) => option.value === order.assignedToId)) {
      available.unshift({
        value: order.assignedToId,
        label: `ผู้รับผิดชอบปัจจุบัน (${order.assignedToId})`,
      })
    }
    return available
  }, [order.assignedToId, techniciansQuery.data])

  if (!canManage) return null

  const currentName = order.assignedToId
    ? options.find((option) => option.value === order.assignedToId)?.label ?? order.assignedToId
    : 'ยังไม่มอบหมาย'
  const isSaving = assignMutation.isPending || unassignMutation.isPending
  const errorMessage = mutationErrorMessage(assignMutation.error ?? unassignMutation.error)
  const canSubmit = Boolean(selectedTechnicianId)
    && selectedTechnicianId !== order.assignedToId
    && !isSaving

  return (
    <Card className="overflow-hidden border-pea-200">
      <div className="-mx-4 -mt-4 mb-4 flex items-start gap-3 border-b border-pea-100 bg-pea-50/70 px-4 py-3.5">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-pea-700 shadow-sm ring-1 ring-pea-100">
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900">ผู้รับผิดชอบใบงาน</h2>
          <p className="mt-0.5 text-xs leading-5 text-gray-600">
            เลือกเฉพาะช่างที่ยังใช้งานอยู่ในสำนักงานของใบงาน
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
        <UserRoundCheck className="h-5 w-5 flex-shrink-0 text-gray-500" aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">ปัจจุบัน</p>
          <p className="truncate text-sm font-semibold text-gray-900">{currentName}</p>
        </div>
      </div>

      {!canAssign ? (
        <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm leading-6 text-gray-600">
          ใบงานที่เสร็จสิ้นหรือยกเลิกแล้วแสดงผู้รับผิดชอบแบบอ่านอย่างเดียว
        </p>
      ) : techniciansQuery.isLoading ? (
        <div className="h-12 animate-pulse rounded-xl bg-gray-100" aria-label="กำลังโหลดรายชื่อช่าง" />
      ) : techniciansQuery.error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>โหลดรายชื่อช่างไม่สำเร็จ</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => { void techniciansQuery.refetch() }}
          >
            ลองใหม่
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Select
            label="ช่างผู้รับผิดชอบ"
            value={selectedTechnicianId}
            options={options}
            placeholder="เลือกช่าง"
            disabled={options.length === 0 || isSaving}
            hint={options.length === 0 ? 'ไม่พบช่างที่พร้อมรับงานในสำนักงานนี้' : undefined}
            onChange={(event) => {
              setSelectedTechnicianId(event.target.value)
              setSuccessMessage(null)
              assignMutation.reset()
              unassignMutation.reset()
            }}
          />

          <Button
            type="button"
            fullWidth
            loading={assignMutation.isPending}
            disabled={!canSubmit}
            onClick={async () => {
              setSuccessMessage(null)
              try {
                await assignMutation.mutateAsync({
                  id: order.id,
                  assignedToId: selectedTechnicianId,
                })
                setSuccessMessage(order.assignedToId ? 'เปลี่ยนผู้รับผิดชอบแล้ว' : 'มอบหมายใบงานแล้ว')
              } catch {
                // React Query exposes the mutation error below the controls.
              }
            }}
          >
            {order.assignedToId ? 'เปลี่ยนผู้รับผิดชอบ' : 'มอบหมายใบงาน'}
          </Button>
        </div>
      )}

      {canUnassignWorkOrder(order) && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {!confirmUnassign ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              fullWidth
              disabled={isSaving}
              leftIcon={<UserMinus className="h-4 w-4" />}
              onClick={() => setConfirmUnassign(true)}
            >
              ยกเลิกการมอบหมาย
            </Button>
          ) : (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
              <p className="text-sm font-medium text-orange-900">
                ยืนยันให้ใบงานนี้กลับเป็นงานที่ยังไม่มีผู้รับผิดชอบ?
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  disabled={isSaving}
                  onClick={() => setConfirmUnassign(false)}
                >
                  กลับ
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  loading={unassignMutation.isPending}
                  onClick={async () => {
                    setSuccessMessage(null)
                    try {
                      await unassignMutation.mutateAsync({ id: order.id })
                      setSelectedTechnicianId('')
                      setConfirmUnassign(false)
                      setSuccessMessage('ยกเลิกการมอบหมายแล้ว')
                    } catch {
                      // React Query exposes the mutation error below the controls.
                    }
                  }}
                >
                  ยืนยัน
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p aria-live="polite" className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </p>
      )}
    </Card>
  )
}
