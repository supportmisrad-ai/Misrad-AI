/**
 * MISRAD AI — Operations Server Actions (barrel re-export)
 *
 * The God File has been split into domain-specific sub-modules under app/actions/ops/:
 *   - vehicles.ts, stock.ts, work-orders.ts, contractors.ts,
 *     projects.ts, settings.ts, purchase-orders.ts, types.ts
 */

// ──── Type re-exports ────
export type { OperationsClientOption } from '@/lib/services/operations/types';
export type { OperationsDashboardData } from '@/lib/services/operations/types';
export type { OperationsProjectsData } from '@/lib/services/operations/types';
export type { OperationsProjectDetail } from '@/lib/services/operations/types';
export type { OperationsSupplierRow } from '@/lib/services/operations/types';
export type { OperationsPurchaseOrderRow } from '@/lib/services/operations/types';
export type { OperationsPurchaseOrderDetail } from '@/lib/services/operations/types';
export type { OperationsPurchaseOrdersData } from '@/lib/services/operations/types';
export type { OperationsPurchaseOrderStatus } from '@/lib/services/operations/types';
export type { OperationsInventoryData } from '@/lib/services/operations/types';
export type { OperationsProjectOption } from '@/lib/services/operations/types';
export type { OperationsWorkOrderStatus } from '@/lib/services/operations/types';
export type { OperationsWorkOrderRow } from '@/lib/services/operations/types';
export type { OperationsTechnicianOption } from '@/lib/services/operations/types';
export type { OperationsVehicleRow } from '@/lib/services/operations/types';
export type { OperationsWorkOrdersData } from '@/lib/services/operations/types';
export type { OperationsInventoryOption } from '@/lib/services/operations/types';
export type { OperationsWorkOrderAttachmentRow } from '@/lib/services/operations/types';
export type { OperationsWorkOrderCheckinRow } from '@/lib/services/operations/types';
export type { OperationsLocationRow } from '@/lib/services/operations/types';
export type { OperationsWorkOrderTypeRow } from '@/lib/services/operations/types';
export type { OperationsBuildingRow } from '@/lib/services/operations/types';
export type { OperationsCallCategoryRow } from '@/lib/services/operations/types';
export type { OperationsDepartmentRow } from '@/lib/services/operations/types';
export type { OperationsCallMessageRow } from '@/lib/services/operations/types';
export type { OperationsWorkOrderPriority } from '@/lib/services/operations/types';
export type { OperationsStockSourceOption } from '@/lib/services/operations/types';
export type { OperationsHolderStockRow } from '@/lib/services/operations/types';

// ──── Vehicles ────
export { getOperationsVehicles, createOperationsVehicle, deleteOperationsVehicle, setOperationsTechnicianActiveVehicle, getOperationsTechnicianActiveVehicle, getOperationsTechnicianOptions } from './ops/vehicles';

// ──── Stock & Inventory ────
export { getOperationsStockSourceOptions, setOperationsWorkOrderStockSource, setOperationsWorkOrderStockSourceToMyActiveVehicle, getOperationsVehicleStockBalances, transferOperationsStockToVehicle, addOperationsStockToActiveVehicle, getOperationsInventoryData, getOperationsInventoryOptions, getOperationsInventoryOptionsForHolder, consumeOperationsInventoryForWorkOrder, getOperationsMaterialsForWorkOrder, createOperationsItem, updateOperationsItem, deleteOperationsItem, checkAndNotifyLowInventory, importInventoryFromCsv, getAiMaterialSuggestions } from './ops/stock';

// ──── Work Orders ────
export { setOperationsWorkOrderCompletionSignature, addOperationsWorkOrderAttachment, getOperationsWorkOrderAttachments, getOperationsWorkOrderCheckins, addOperationsWorkOrderCheckin, setOperationsWorkOrderAssignedTechnician, getOperationsWorkOrdersData, bulkUpdateOperationsWorkOrderStatus, createOperationsWorkOrder, getOperationsWorkOrderById, setOperationsWorkOrderStatus, updateOperationsWorkOrder } from './ops/work-orders';

// ──── Contractors ────
export { contractorSetWorkOrderCompletionSignature, contractorResolveTokenForApi, contractorValidateWorkOrderAccess, contractorGetWorkOrderAttachments, contractorAddWorkOrderAttachment, contractorGetWorkOrderCheckins, contractorAddWorkOrderCheckin, createOperationsContractorToken, getOperationsContractorPortalData, contractorMarkWorkOrderDone } from './ops/contractors';

// ──── Projects & Dashboard ────
export { getOperationsDashboardData, getOperationsProjectsData, getOperationsProjectOptions, getOperationsProjectById, updateOperationsProject, createOperationsProject, getOperationsClientOptions } from './ops/projects';

// ──── Settings (locations, types, buildings, categories, departments, messages, suppliers) ────
export { getOperationsLocations, createOperationsLocation, deleteOperationsLocation, getOperationsWorkOrderTypes, createOperationsWorkOrderType, deleteOperationsWorkOrderType, getOperationsBuildings, createOperationsBuilding, updateOperationsBuilding, deleteOperationsBuilding, getOperationsCallCategories, createOperationsCallCategory, updateOperationsCallCategory, deleteOperationsCallCategory, getOperationsDepartments, createOperationsDepartment, deleteOperationsDepartment, getOperationsCallMessages, createOperationsCallMessage, updateOperationsCallMessage, deleteOperationsCallMessage, getOperationsSuppliers, createOperationsSupplier, deleteOperationsSupplier } from './ops/settings';

// ──── Purchase Orders ────
export { getOperationsPurchaseOrders, getOperationsPurchaseOrderById, createOperationsPurchaseOrder, updateOperationsPurchaseOrderStatus, receiveOperationsPurchaseOrderItems, deleteOperationsPurchaseOrder, autoGeneratePurchaseOrderFromLowInventory } from './ops/purchase-orders';
