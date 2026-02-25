'use server';

/**
 * MISRAD AI — Operations Server Actions (barrel)
 *
 * Split into domain-specific sub-modules:
 *   - vehicles.ts       — vehicles + technician vehicle assignments
 *   - stock.ts          — stock, inventory, materials, items
 *   - work-orders.ts    — work orders CRUD, status, bulk, attachments, checkins
 *   - contractors.ts    — contractor portal, tokens
 *   - projects.ts       — projects, dashboard, client options
 *   - settings.ts       — locations, work order types, buildings, categories, departments, messages, suppliers
 *   - purchase-orders.ts — purchase orders
 *   - types.ts          — type re-exports
 */

export {
  getOperationsVehicles,
  createOperationsVehicle,
  deleteOperationsVehicle,
  setOperationsTechnicianActiveVehicle,
  getOperationsTechnicianActiveVehicle,
  getOperationsTechnicianOptions,
} from './vehicles';

export {
  getOperationsStockSourceOptions,
  setOperationsWorkOrderStockSource,
  setOperationsWorkOrderStockSourceToMyActiveVehicle,
  getOperationsVehicleStockBalances,
  transferOperationsStockToVehicle,
  addOperationsStockToActiveVehicle,
  getOperationsInventoryData,
  getOperationsInventoryOptions,
  getOperationsInventoryOptionsForHolder,
  consumeOperationsInventoryForWorkOrder,
  getOperationsMaterialsForWorkOrder,
  createOperationsItem,
  updateOperationsItem,
  deleteOperationsItem,
  checkAndNotifyLowInventory,
  importInventoryFromCsv,
  getAiMaterialSuggestions,
} from './stock';

export {
  setOperationsWorkOrderCompletionSignature,
  addOperationsWorkOrderAttachment,
  getOperationsWorkOrderAttachments,
  getOperationsWorkOrderCheckins,
  addOperationsWorkOrderCheckin,
  setOperationsWorkOrderAssignedTechnician,
  getOperationsWorkOrdersData,
  bulkUpdateOperationsWorkOrderStatus,
  createOperationsWorkOrder,
  getOperationsWorkOrderById,
  setOperationsWorkOrderStatus,
  updateOperationsWorkOrder,
} from './work-orders';

export {
  contractorSetWorkOrderCompletionSignature,
  contractorResolveTokenForApi,
  contractorValidateWorkOrderAccess,
  contractorGetWorkOrderAttachments,
  contractorAddWorkOrderAttachment,
  contractorGetWorkOrderCheckins,
  contractorAddWorkOrderCheckin,
  createOperationsContractorToken,
  getOperationsContractorPortalData,
  contractorMarkWorkOrderDone,
} from './contractors';

export {
  getOperationsDashboardData,
  getOperationsProjectsData,
  getOperationsProjectOptions,
  getOperationsProjectById,
  updateOperationsProject,
  createOperationsProject,
  getOperationsClientOptions,
} from './projects';

export {
  getOperationsLocations,
  createOperationsLocation,
  deleteOperationsLocation,
  getOperationsWorkOrderTypes,
  createOperationsWorkOrderType,
  deleteOperationsWorkOrderType,
  getOperationsBuildings,
  createOperationsBuilding,
  updateOperationsBuilding,
  deleteOperationsBuilding,
  getOperationsCallCategories,
  createOperationsCallCategory,
  updateOperationsCallCategory,
  deleteOperationsCallCategory,
  getOperationsDepartments,
  createOperationsDepartment,
  deleteOperationsDepartment,
  getOperationsCallMessages,
  createOperationsCallMessage,
  updateOperationsCallMessage,
  deleteOperationsCallMessage,
  getOperationsSuppliers,
  createOperationsSupplier,
  deleteOperationsSupplier,
} from './settings';

export {
  getOperationsPurchaseOrders,
  getOperationsPurchaseOrderById,
  createOperationsPurchaseOrder,
  updateOperationsPurchaseOrderStatus,
  receiveOperationsPurchaseOrderItems,
  deleteOperationsPurchaseOrder,
  autoGeneratePurchaseOrderFromLowInventory,
} from './purchase-orders';
