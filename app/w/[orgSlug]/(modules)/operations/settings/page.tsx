// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

import {
  createOperationsBuilding,
  createOperationsCallCategory,
  createOperationsDepartment,
  createOperationsLocation,
  createOperationsVehicle,
  createOperationsWorkOrderType,
  deleteOperationsBuilding,
  deleteOperationsCallCategory,
  deleteOperationsDepartment,
  deleteOperationsLocation,
  deleteOperationsVehicle,
  deleteOperationsWorkOrderType,
  getOperationsBuildings,
  getOperationsCallCategories,
  getOperationsDepartments,
  getOperationsLocations,
  getOperationsVehicles,
  getOperationsWorkOrderTypes,
} from '@/app/actions/operations';
import SettingsClient from './SettingsClient';

export default async function OperationsSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const [locationsRes, typesRes, vehiclesRes, categoriesRes, buildingsRes, departmentsRes] = await Promise.all([
    getOperationsLocations({ orgSlug }),
    getOperationsWorkOrderTypes({ orgSlug }),
    getOperationsVehicles({ orgSlug }),
    getOperationsCallCategories({ orgSlug }),
    getOperationsBuildings({ orgSlug }),
    getOperationsDepartments({ orgSlug }),
  ]);

  const locations = locationsRes.success ? locationsRes.data ?? [] : [];
  const types = typesRes.success ? typesRes.data ?? [] : [];
  const vehicles = vehiclesRes.success ? vehiclesRes.data ?? [] : [];
  const categories = categoriesRes.success ? categoriesRes.data ?? [] : [];
  const buildings = buildingsRes.success ? buildingsRes.data ?? [] : [];
  const departments = departmentsRes.success ? departmentsRes.data ?? [] : [];

  // ──── Server Actions (no redirect — client handles toast + router.refresh) ────

  async function addCategoryAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const color = String(formData.get('color') || '') || null;
    const slaRaw = String(formData.get('sla') || '');
    const maxResponseMinutes = slaRaw ? parseInt(slaRaw, 10) : null;
    const res = await createOperationsCallCategory({ orgSlug, name, color, maxResponseMinutes: Number.isFinite(maxResponseMinutes) ? maxResponseMinutes : null });
    if (!res.success) throw new Error(res.error || 'שגיאה בהוספת קטגוריה');
  }

  async function deleteCategoryAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsCallCategory({ orgSlug, id });
    if (!res.success) throw new Error(res.error || 'שגיאה במחיקת קטגוריה');
  }

  async function addBuildingAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const address = String(formData.get('address') || '') || null;
    const floorsRaw = String(formData.get('floors') || '');
    const floors = floorsRaw ? parseInt(floorsRaw, 10) : null;
    const res = await createOperationsBuilding({ orgSlug, name, address, floors: Number.isFinite(floors) ? floors : null });
    if (!res.success) throw new Error(res.error || 'שגיאה בהוספת מבנה');
  }

  async function deleteBuildingAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsBuilding({ orgSlug, id });
    if (!res.success) throw new Error(res.error || 'שגיאה במחיקת מבנה');
  }

  async function addDepartmentAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const color = String(formData.get('color') || '') || null;
    const res = await createOperationsDepartment({ orgSlug, name, color });
    if (!res.success) throw new Error(res.error || 'שגיאה בהוספת מחלקה');
  }

  async function deleteDepartmentAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsDepartment({ orgSlug, id });
    if (!res.success) throw new Error(res.error || 'שגיאה במחיקת מחלקה');
  }

  async function addLocationAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const res = await createOperationsLocation({ orgSlug, name });
    if (!res.success) throw new Error(res.error || 'שגיאה בהוספת מחסן');
  }

  async function deleteLocationAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsLocation({ orgSlug, id });
    if (!res.success) throw new Error(res.error || 'שגיאה במחיקת מחסן');
  }

  async function addVehicleAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const res = await createOperationsVehicle({ orgSlug, name });
    if (!res.success) throw new Error(res.error || 'שגיאה בהוספת רכב');
  }

  async function deleteVehicleAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsVehicle({ orgSlug, id });
    if (!res.success) throw new Error(res.error || 'שגיאה במחיקת רכב');
  }

  async function addTypeAction(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '');
    const res = await createOperationsWorkOrderType({ orgSlug, name });
    if (!res.success) throw new Error(res.error || 'שגיאה בהוספת סוג קריאה');
  }

  async function deleteTypeAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const res = await deleteOperationsWorkOrderType({ orgSlug, id });
    if (!res.success) throw new Error(res.error || 'שגיאה במחיקת סוג קריאה');
  }

  return (
    <SettingsClient
      orgSlug={orgSlug}
      categories={categories}
      buildings={buildings}
      departments={departments}
      locations={locations}
      vehicles={vehicles}
      types={types}
      addCategoryAction={addCategoryAction}
      deleteCategoryAction={deleteCategoryAction}
      addBuildingAction={addBuildingAction}
      deleteBuildingAction={deleteBuildingAction}
      addDepartmentAction={addDepartmentAction}
      deleteDepartmentAction={deleteDepartmentAction}
      addLocationAction={addLocationAction}
      deleteLocationAction={deleteLocationAction}
      addVehicleAction={addVehicleAction}
      deleteVehicleAction={deleteVehicleAction}
      addTypeAction={addTypeAction}
      deleteTypeAction={deleteTypeAction}
    />
  );
}
