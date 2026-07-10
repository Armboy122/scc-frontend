// ─── Domain enums ────────────────────────────────────────────────────────────

export type Role = 'admin' | 'exec' | 'tech'

export type CoverStatus = 'IN_STOCK' | 'INSTALLED' | 'RETIRED'

export type WorkOrderStatus =
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'REMOVAL_DUE'
  | 'REMOVING'
  | 'COMPLETED'
  | 'CANCELLED'

export type NotificationType =
  | 'REMOVAL_DUE'
  | 'BORROW_REQUESTED'
  | 'BORROW_APPROVED'
  | 'BORROW_REJECTED'
  | 'BORROW_ACTIVATED'
  | 'BORROW_OVERDUE'
  | 'BORROW_RETURNED'
  | 'DISCREPANCY_REPORTED'
  | 'DISCREPANCY_RESOLVED'
  | 'WORKORDER_ASSIGNED'

export type BorrowStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'ON_LOAN'
  | 'RETURNED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'OVERDUE'

export type BorrowDirection = 'in' | 'out'

export type DiscrepancyType =
  | 'UNEXPECTED_COVER'
  | 'MISSING_COVER'
  | 'CAPACITY_SHORTFALL'
  | 'OTHER'

export type ManualDiscrepancyType = Exclude<DiscrepancyType, 'CAPACITY_SHORTFALL'>

export type DiscrepancyStatus = 'OPEN' | 'RESOLVED'

export type Rfc3339Timestamp = string

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

export interface TechnicianOption {
  id: string
  name: string
  officeId: string
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
  createdAt: string
  installedAt?: string
  removedAt?: string
  photoInstallUrl?: string
  photoRemoveUrl?: string
  gpsLat?: number
  gpsLng?: number
  remark?: string
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
  assignedToId?: string
  /** @deprecated legacy frontend alias; API responses use assignedToId. */
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
  reservedPlanned: number
  reservedBorrow: number
  availableForWorkOrder: number
  installed: number
  onLoanOut: number
  onLoanIn: number
  total: number
}

export interface DashboardWorkOrdersByStatus {
  SCHEDULED: number
  ACTIVE: number
  REMOVAL_DUE: number
  REMOVING: number
  COMPLETED: number
  CANCELLED: number
}

export interface DashboardOfficeStock {
  office: Office
  stock: StockSummary
}

export interface DashboardSummary {
  stockByOffice: DashboardOfficeStock[]
  workOrdersByStatus: DashboardWorkOrdersByStatus
  dueSoon: WorkOrder[]
  overdueRemovals: WorkOrder[]
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  message: string
  workOrderId?: string
  borrowId?: string
  discrepancyId?: string
  readAt?: string
  createdAt: string
}

export interface BorrowCoverSummary {
  id: string
  assetCode: string
  status: CoverStatus
  ownerOfficeId: string
  currentOfficeId: string
}

export interface Borrow {
  id: string
  status: BorrowStatus
  borrowerOffice: Office
  lenderOffice: Office
  requestedQty: number
  covers: BorrowCoverSummary[]
  returnDate: Rfc3339Timestamp
  note: string | null
  createdById: string
  approvedById: string | null
  activatedById: string | null
  returnedById: string | null
  createdAt: Rfc3339Timestamp
  updatedAt: Rfc3339Timestamp
  activatedAt: Rfc3339Timestamp | null
  returnedAt: Rfc3339Timestamp | null
}

export interface BorrowAvailability {
  office: Office
  ownedInStock: number
  reservedPlanned: number
  reservedBorrow: number
  borrowableCapacity: number
}

export interface Discrepancy {
  id: string
  office: Office
  type: DiscrepancyType
  status: DiscrepancyStatus
  reason: string
  expectedQty: number | null
  observedQty: number | null
  coverId: string | null
  workOrderId: string | null
  borrowId: string | null
  reportedById: string | null
  resolvedById: string | null
  resolutionNote: string | null
  createdAt: Rfc3339Timestamp
  updatedAt: Rfc3339Timestamp
  resolvedAt: Rfc3339Timestamp | null
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
  refreshToken: string
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
  coverIds: string[]
  photoFile?: File
}

export interface CompleteRemovalRequest {
  installations: Installation[]
  photoFile: File
}

export interface CreateBorrowRequest {
  lenderOfficeId: string
  requestedQty: number
  returnDate: Rfc3339Timestamp
  note?: string
}

export interface CreateDiscrepancyRequest {
  officeId?: string
  type: ManualDiscrepancyType
  reason: string
  expectedQty?: number
  observedQty?: number
  coverId?: string
  workOrderId?: string
  borrowId?: string
}

export interface ResolveDiscrepancyRequest {
  resolutionNote: string
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface WorkOrderQueryParams extends PaginationParams {
  status?: WorkOrderStatus
  mine?: boolean
  officeId?: string
}

export interface CoverQueryParams extends PaginationParams {
  status?: CoverStatus
  officeId?: string
  q?: string
}

export interface BorrowQueryParams extends PaginationParams {
  direction?: BorrowDirection
  status?: BorrowStatus
}

export interface DiscrepancyQueryParams extends PaginationParams {
  status?: DiscrepancyStatus
  type?: DiscrepancyType
  officeId?: string
}
