import 'server-only';

export type OperationsClientOption = {
  id: string;
  label: string;
  source: 'nexus' | 'misrad' | 'client';
};

export type OperationsDashboardData = {
  recentProjects: Array<{
    id: string;
    title: string;
    status: string;
    clientName: string | null;
    updatedAt: string;
  }>;
  inventorySummary: {
    ok: number;
    low: number;
    critical: number;
    total: number;
  };
  workOrderStats: {
    open: number;
    inProgress: number;
    doneToday: number;
    total: number;
    slaBreach: number;
    unassigned: number;
    priorityHigh: number;
    priorityUrgent: number;
    priorityCritical: number;
  };
  recentWorkOrders: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    categoryName: string | null;
    technicianLabel: string | null;
    slaDeadline: string | null;
    createdAt: string;
  }>;
};

export type OperationsProjectsData = {
  projects: Array<{
    id: string;
    title: string;
    status: string;
    clientName: string | null;
    createdAt: string;
  }>;
};

export type OperationsProjectDetail = {
  id: string;
  title: string;
  status: string;
  canonicalClientId: string | null;
  clientName: string | null;
  installationAddress: string | null;
  source: string | null;
  sourceRefId: string | null;
  createdAt: string;
  updatedAt: string;
  workOrders: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
};

export type OperationsInventoryData = {
  items: Array<{
    id: string;
    itemName: string;
    sku: string | null;
    onHand: number;
    minLevel: number;
  }>;
};

export type OperationsProjectOption = {
  id: string;
  title: string;
};

export type OperationsWorkOrderStatus = 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'DONE';

export type OperationsWorkOrderPriority = 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';

export type OperationsWorkOrderRow = {
  id: string;
  title: string;
  projectId: string | null;
  projectTitle: string | null;
  status: OperationsWorkOrderStatus;
  priority: OperationsWorkOrderPriority;
  technicianLabel: string | null;
  installationLat: number | null;
  installationLng: number | null;
  categoryId: string | null;
  categoryName: string | null;
  departmentId: string | null;
  buildingId: string | null;
  buildingName: string | null;
  floor: string | null;
  unit: string | null;
  reporterName: string | null;
  reporterPhone: string | null;
  slaDeadline: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type OperationsBuildingRow = {
  id: string;
  name: string;
  address: string | null;
  floors: number | null;
  notes: string | null;
  createdAt: string;
};

export type OperationsCallCategoryRow = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  maxResponseMinutes: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

export type OperationsDepartmentRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
};

export type OperationsCallMessageRow = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  attachmentUrl: string | null;
  attachmentType: string | null;
  mentions: string[];
  createdAt: string;
};

export type OperationsTechnicianOption = {
  id: string;
  label: string;
};

export type OperationsVehicleRow = {
  id: string;
  name: string;
  createdAt: string;
};

export type OperationsStockSourceOption = {
  holderId: string;
  label: string;
  group: 'WAREHOUSE' | 'VEHICLE' | 'TECHNICIAN';
};

export type OperationsHolderStockRow = {
  itemId: string;
  label: string;
  onHand: number;
  unit: string | null;
};

export type OperationsWorkOrdersData = {
  workOrders: OperationsWorkOrderRow[];
  totalCount: number;
  page: number;
  limit: number;
};

export type OperationsInventoryOption = {
  inventoryId: string;
  itemId: string;
  label: string;
  onHand: number;
  unit: string | null;
};

export type OperationsWorkOrderAttachmentRow = {
  id: string;
  url: string;
  mimeType: string | null;
  createdAt: string;
};

export type OperationsWorkOrderCheckinRow = {
  id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  createdAt: string;
};

export type OperationsLocationRow = {
  id: string;
  name: string;
  createdAt: string;
};

export type OperationsWorkOrderTypeRow = {
  id: string;
  name: string;
  createdAt: string;
};

export type OperationsSupplierRow = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
};
