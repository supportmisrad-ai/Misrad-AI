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

export type OperationsWorkOrderStatus = 'NEW' | 'IN_PROGRESS' | 'DONE';

export type OperationsWorkOrderRow = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  status: OperationsWorkOrderStatus;
  technicianLabel: string | null;
  installationLat: number | null;
  installationLng: number | null;
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
