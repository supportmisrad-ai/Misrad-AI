import { Select } from '@/components/ui/select';
import { FormPendingButton } from '@/components/operations/FormPendingButton';
import type {
  OperationsInventoryOption,
  OperationsStockSourceOption,
} from '@/lib/services/operations/types';

type MaterialRow = {
  id: string;
  itemLabel: string;
  qty: number;
  createdAt: string;
};

export default function WorkOrderMaterialsTab({
  stockSourceLabel,
  stockSourceHolderId,
  stockSourceOptions,
  stockSourcesError,
  inventoryOptions,
  inventoryOptionsError,
  materials,
  materialsError,
  setStockSourceAction,
  useMyActiveVehicleSourceAction,
  addMaterialAction,
}: {
  stockSourceLabel: string | null;
  stockSourceHolderId: string | null;
  stockSourceOptions: OperationsStockSourceOption[];
  stockSourcesError: string | null;
  inventoryOptions: OperationsInventoryOption[];
  inventoryOptionsError: string | null;
  materials: MaterialRow[];
  materialsError: string | null;
  setStockSourceAction: (formData: FormData) => Promise<void>;
  useMyActiveVehicleSourceAction: () => Promise<void>;
  addMaterialAction: (formData: FormData) => Promise<void>;
}) {
  const stockAvailable = inventoryOptions.filter((o) => o.onHand > 0);

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
        <div className="text-xs font-semibold text-slate-500">מקור מלאי לקריאה</div>
        <div className="mt-2 text-sm text-slate-700">
          {stockSourceLabel ? stockSourceLabel : <span className="text-slate-400">—</span>}
        </div>

        <form action={setStockSourceAction} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Select
              name="holderId"
              required
              defaultValue={stockSourceHolderId ? String(stockSourceHolderId) : ''}
            >
              <option value="" disabled>
                {stockSourceOptions.length ? 'בחר מקור מלאי…' : 'אין מקורות מלאי זמינים'}
              </option>
              <optgroup label="מחסן">
                {stockSourceOptions
                  .filter((o) => o.group === 'WAREHOUSE')
                  .map((o) => (
                    <option key={String(o.holderId)} value={String(o.holderId)}>
                      {String(o.label)}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="רכבים">
                {stockSourceOptions
                  .filter((o) => o.group === 'VEHICLE')
                  .map((o) => (
                    <option key={String(o.holderId)} value={String(o.holderId)}>
                      {String(o.label)}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="אצל טכנאי אחר">
                {stockSourceOptions
                  .filter((o) => o.group === 'TECHNICIAN')
                  .map((o) => (
                    <option key={String(o.holderId)} value={String(o.holderId)}>
                      {String(o.label)}
                    </option>
                  ))}
              </optgroup>
            </Select>
            {stockSourcesError ? (
              <div className="mt-2 text-xs font-bold text-rose-700">{stockSourcesError}</div>
            ) : null}
          </div>

          <div>
            <FormPendingButton
              pendingText="שומר..."
              className="w-full h-11 inline-flex items-center justify-center rounded-xl px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300 transition-all duration-150 disabled:opacity-50"
            >
              שמור מקור
            </FormPendingButton>
          </div>
        </form>

        <form action={useMyActiveVehicleSourceAction} className="mt-3">
          <FormPendingButton
            pendingText="מעדכן..."
            className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            השתמש ברכב הפעיל שלי
          </FormPendingButton>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
        <div className="text-xs font-semibold text-slate-500">הוספת חומר לקריאה</div>

        <div className="mt-2 text-xs text-slate-600">
          מקור מלאי: {stockSourceLabel ? stockSourceLabel : '—'}
        </div>

        <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-black text-slate-700">מלאי זמין במקור</div>
          <div className="mt-2 text-xs text-slate-600">
            {stockAvailable.length
              ? stockAvailable
                  .slice(0, 8)
                  .map((o) => `${String(o.label)}: ${String(o.onHand)}${o.unit ? ` ${String(o.unit)}` : ''}`)
                  .join(' · ')
              : 'אין כרגע מלאי זמין במקור הזה'}
          </div>
        </div>

        <form action={addMaterialAction} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label htmlFor="inventoryId" className="block text-xs font-semibold text-slate-500 mb-1.5">
              פריט
            </label>
            <Select
              id="inventoryId"
              name="inventoryId"
              required
              defaultValue=""
            >
              <option value="" disabled>
                {inventoryOptions.length ? 'בחר פריט…' : 'אין פריטים זמינים'}
              </option>
              {inventoryOptions.map((opt) => (
                <option key={opt.inventoryId} value={opt.inventoryId}>
                  {opt.label} — {opt.onHand}{opt.unit ? ` ${opt.unit}` : ''}
                </option>
              ))}
            </Select>
            {inventoryOptionsError ? (
              <div className="mt-2 text-xs font-bold text-rose-700">{inventoryOptionsError}</div>
            ) : null}
          </div>

          <div>
            <label htmlFor="qty" className="block text-xs font-semibold text-slate-500 mb-1.5">
              כמות
            </label>
            <input
              id="qty"
              name="qty"
              type="number"
              step="0.001"
              min="0"
              required
              className="h-11 w-full rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all duration-150 hover:border-slate-300 hover:shadow focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100"
              placeholder="1"
            />
          </div>

          <div className="md:col-span-3">
            <FormPendingButton
              pendingText="מוסיף חומר..."
              className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              הוסף חומר והורד מהמלאי
            </FormPendingButton>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
        <div className="text-xs font-black text-slate-700">חומרים שנמשכו</div>

        <div className="mt-3 space-y-2">
          {materials.length ? (
            materials.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-900 truncate">{m.itemLabel}</div>
                  <div className="text-xs text-slate-500 mt-1">{new Date(m.createdAt).toLocaleString('he-IL')}</div>
                </div>
                <div className="text-sm font-black text-slate-900">{m.qty}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">אין עדיין חומרים לקריאה הזו</div>
          )}
        </div>

        {materialsError ? (
          <div className="mt-3 text-sm text-rose-800">{materialsError}</div>
        ) : null}
      </div>
    </>
  );
}
