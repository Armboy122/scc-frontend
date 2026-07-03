// ─── Domain enums ────────────────────────────────────────────────────────────

export type Role = 'admin' | 'exec' | 'tech'

export type CoverStatus = 'IN_STOCK' | 'INSTALLED' | 'RETIRED'

export type WorkOrderStatus =
  | 'SCHEDULED'
  | 'INSTALLING'
  | 'ACTIVE'
  | 'REMOVAL_DUE'
  | 'REMOVING'
  | 'COMPLETED'
  | 'CANCELLED'

export type NotificationType = 'REMOVAL_DUE' | 'OVERDUE' | 'INFO'

export type BorrowStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'ON_LOAN'
  | 'RETURNED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'OVERDUE'

export type BorrowDirection = 'in' | 'out'

// ─── Core domain models ───────────────────────────────────────────────────────

export interface Office {
  id: string
  name: string
  workHubId: string
}

export interface User {
  id: string
  name: string
  username: string
  role: Role
  officeId?: string
  office?: Office
}

export interface Cover {
  id: string
  assetCode: string
  qrCode: string
  nfcId?: string
  status: CoverStatus
  ownerOfficeId: string
  currentOfficeId: string
  ownerOffice?: Office
  currentOffice?: Office
  createdAt: string
  updatedAt: string
}

export interface Installation {
  id: string
  workOrderId: string
  coverId: string
  cover?: Cover
  installedAt?: string
  removedAt?: string
  photoUrl?: string
  latitude?: number
  longitude?: number
}

export interface WorkOrder {
  id: string
  status: WorkOrderStatus
  customerName: string
  customerPhone?: string
  installDate?: string
  removalDate?: string
  plannedQty: number
  actualQty?: number
  latitude?: number
  longitude?: number
  gpsLat?: number
  gpsLng?: number
  note?: string
  officeId: string
  office?: Office
  assignedTo?: string
  assignedUser?: User
  installations?: Installation[]
  createdAt: string
  updatedAt: string
}

export interface StockSummary {
  officeId: string
  office?: Office
  inStock: number
  installed: number
  onLoanOut: number
  onLoanIn: number
  total: number
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  workOrderId?: string
  workOrder?: Pick<WorkOrder, 'id' | 'customerName' | 'status'>
  createdAt: string
}

export interface Borrow {
  id: string
  status: BorrowStatus
  fromOfficeId?: string
  toOfficeId?: string
  fromOffice?: Office
  toOffice?: Office
  qty: number
  coverIds?: string[]
  covers?: Cover[]
  borrowDate: string
  returnDate: string
  createdById?: string
  createdBy?: User
  createdAt?: string
  updatedAt?: string
}

// ─── API envelope ─────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number
  limit: number
  total: number
}

export interface ApiResponse<T> {
  data: T | null
  error: { code: string; message: string } | null
  meta?: PaginationMeta | null
}

// ─── Request / response shapes ────────────────────────────────────────────────

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RefreshResponse {
  accessToken: string
  refreshToken?: string
  user: User
}

export interface CreateWorkOrderRequest {
  officeId: string
  customerName: string
  customerPhone?: string
  installDate: string
  removalDate: string
  plannedQty: number
  gpsLat?: number
  gpsLng?: number
  note?: string
}

export interface RegisterCoverRequest {
  assetCode: string
  qrCode?: string
  nfcId?: string
  ownerOfficeId: string
}

export interface SubmitInstallRequest {
  coverCodes: string[]
  photoUrl?: string
}

export interface SubmitRemoveRequest {
  coverCodes: string[]
  latitude?: number
  longitude?: number
}

export interface CreateBorrowRequest {
  toOfficeId: string
  qty: number
  coverIds?: string[]
  borrowDate: string
  returnDate: string
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface WorkOrderQueryParams extends PaginationParams {
  status?: WorkOrderStatus
  assignedTo?: string
  officeId?: string
}

export interface CoverQueryParams extends PaginationParams {
  status?: CoverStatus
  officeId?: string
  search?: string
}

export interface BorrowQueryParams extends PaginationParams {
  direction?: BorrowDirection
  status?: BorrowStatus
}
