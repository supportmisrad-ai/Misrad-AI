'use server';

import { redirect } from 'next/navigation';

import {
  consumeOperationsInventoryForWorkOrder,
  addOperationsWorkOrderAttachment,
  addOperationsWorkOrderCheckin,
  setOperationsWorkOrderAssignedTechnician,
  setOperationsWorkOrderCompletionSignature,
  setOperationsWorkOrderStockSourceToMyActiveVehicle,
  setOperationsWorkOrderStockSource,
  setOperationsWorkOrderStatus,
} from '@/app/actions/operations';
import {
  uploadOpsWorkOrderAttachmentInternal,
  uploadOpsWorkOrderSignatureInternal,
} from '@/lib/services/operations/uploads';

function woUrl(base: string, id: string, extra = ''): string {
  return `${base}/work-orders/${encodeURIComponent(id)}${extra}`;
}

export async function startAction(base: string, woId: string, orgSlug: string) {
  const result = await setOperationsWorkOrderStatus({ orgSlug, id: woId, status: 'IN_PROGRESS' });
  if (result.success) redirect(woUrl(base, woId, `?flash=${encodeURIComponent('הקריאה עודכנה לסטטוס בטיפול')}`));
  const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בעדכון סטטוס');
  redirect(woUrl(base, woId, `?error=${message}`));
}

export async function doneAction(base: string, woId: string, orgSlug: string) {
  const result = await setOperationsWorkOrderStatus({ orgSlug, id: woId, status: 'DONE' });
  if (result.success) redirect(woUrl(base, woId, `?flash=${encodeURIComponent('הקריאה סומנה כהושלמה')}`));
  const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בעדכון סטטוס');
  redirect(woUrl(base, woId, `?error=${message}`));
}

export async function assignTechnicianAction(
  base: string,
  woId: string,
  orgSlug: string,
  formData: FormData,
) {
  const technicianIdRaw = formData.get('technicianId');
  const technicianId =
    technicianIdRaw === null || technicianIdRaw === undefined || technicianIdRaw === ''
      ? null
      : String(technicianIdRaw);

  const result = await setOperationsWorkOrderAssignedTechnician({ orgSlug, id: woId, technicianId });
  if (result.success) redirect(woUrl(base, woId, `?flash=${encodeURIComponent('טכנאי שויך בהצלחה')}`));
  const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בשיוך טכנאי');
  redirect(woUrl(base, woId, `?error=${message}`));
}

export async function completeWithSignatureAction(
  base: string,
  woId: string,
  orgSlug: string,
  formData: FormData,
) {
  const signatureDataUrl = String(formData.get('signatureDataUrl') || '').trim();
  if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/')) {
    redirect(woUrl(base, woId, `?error=${encodeURIComponent('חובה לצרף חתימה')}`));
  }

  const uploaded = await uploadOpsWorkOrderSignatureInternal({ orgSlug, workOrderId: woId, signatureDataUrl });
  if (!uploaded.success || !uploaded.ref) {
    const msg = uploaded.error ? String(uploaded.error) : 'שגיאה בהעלאת חתימה';
    redirect(woUrl(base, woId, `?error=${encodeURIComponent(msg)}`));
  }

  const ref = uploaded.ref;

  const saveSig = await setOperationsWorkOrderCompletionSignature({ orgSlug, id: woId, signatureUrl: ref });
  if (!saveSig.success) {
    const msg = saveSig.error ? String(saveSig.error) : 'שגיאה בשמירת חתימה';
    redirect(woUrl(base, woId, `?error=${encodeURIComponent(msg)}`));
  }

  const done = await setOperationsWorkOrderStatus({ orgSlug, id: woId, status: 'DONE' });
  if (!done.success) {
    const msg = done.error ? String(done.error) : 'שגיאה בעדכון סטטוס';
    redirect(woUrl(base, woId, `?error=${encodeURIComponent(msg)}`));
  }

  redirect(woUrl(base, woId, `?flash=${encodeURIComponent('עבודה הושלמה וחתימה נשמרה')}`));
}

export async function uploadAction(
  base: string,
  woId: string,
  orgSlug: string,
  formData: FormData,
) {
  const file = formData.get('file') as File | null;
  if (!file) {
    redirect(woUrl(base, woId, `?error=${encodeURIComponent('חסר קובץ')}`));
  }

  const uploaded = await uploadOpsWorkOrderAttachmentInternal({ orgSlug, workOrderId: woId, file });

  if (!uploaded.success || !uploaded.ref || !uploaded.path) {
    const msg = uploaded.error ? String(uploaded.error) : 'שגיאה בהעלאת קובץ';
    redirect(woUrl(base, woId, `?error=${encodeURIComponent(msg)}`));
  }

  const ref = uploaded.ref;

  const save = await addOperationsWorkOrderAttachment({
    orgSlug,
    workOrderId: woId,
    storageBucket: uploaded.bucket,
    storagePath: uploaded.path,
    url: ref,
    mimeType: uploaded.mimeType || null,
  });

  if (!save.success) {
    const msg = save.error ? String(save.error) : 'שגיאה בשמירת קובץ';
    redirect(woUrl(base, woId, `?error=${encodeURIComponent(msg)}`));
  }

  redirect(woUrl(base, woId, `?flash=${encodeURIComponent('קובץ הועלה בהצלחה')}`));
}

export async function checkinAction(
  base: string,
  woId: string,
  orgSlug: string,
  formData: FormData,
) {
  const lat = Number(formData.get('lat'));
  const lng = Number(formData.get('lng'));
  const accuracyRaw = formData.get('accuracy');
  const accuracy =
    accuracyRaw === null || accuracyRaw === undefined || accuracyRaw === ''
      ? null
      : Number(accuracyRaw);

  const result = await addOperationsWorkOrderCheckin({ orgSlug, workOrderId: woId, lat, lng, accuracy });
  if (!result.success) {
    const msg = result.error ? String(result.error) : 'שגיאה בשמירת מיקום';
    redirect(woUrl(base, woId, `?error=${encodeURIComponent(msg)}`));
  }
  redirect(woUrl(base, woId, `?flash=${encodeURIComponent('דיווח הגעה נשמר')}`));
}

export async function addMaterialAction(
  base: string,
  woId: string,
  orgSlug: string,
  formData: FormData,
) {
  const inventoryId = String(formData.get('inventoryId') || '');
  const qty = Number(formData.get('qty'));

  const result = await consumeOperationsInventoryForWorkOrder({ orgSlug, workOrderId: woId, inventoryId, qty });

  if (result.success) redirect(woUrl(base, woId, `?tab=materials&flash=${encodeURIComponent('חומר נוסף בהצלחה')}`));
  const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בהוספת חומר');
  redirect(woUrl(base, woId, `?tab=materials&error=${message}`));
}

export async function setStockSourceAction(
  base: string,
  woId: string,
  orgSlug: string,
  formData: FormData,
) {
  const holderId = String(formData.get('holderId') || '').trim();
  const result = await setOperationsWorkOrderStockSource({ orgSlug, workOrderId: woId, holderId });
  if (result.success) redirect(woUrl(base, woId, `?tab=materials&flash=${encodeURIComponent('מקור מלאי נשמר')}`));
  const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בשמירת מקור מלאי');
  redirect(woUrl(base, woId, `?tab=materials&error=${message}`));
}

export async function useMyActiveVehicleSourceAction(
  base: string,
  woId: string,
  orgSlug: string,
) {
  const result = await setOperationsWorkOrderStockSourceToMyActiveVehicle({ orgSlug, workOrderId: woId });
  if (result.success) redirect(woUrl(base, woId, `?tab=materials&flash=${encodeURIComponent('מקור מלאי עודכן לרכב הפעיל')}`));
  const message = result.error ? encodeURIComponent(result.error) : encodeURIComponent('שגיאה בקביעת מקור מלאי');
  redirect(woUrl(base, woId, `?tab=materials&error=${message}`));
}
