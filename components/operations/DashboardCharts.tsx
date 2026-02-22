'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type WorkOrderStats = {
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

type InventorySummary = {
  ok: number;
  low: number;
  critical: number;
  total: number;
};

const STATUS_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#94a3b8'];
const INVENTORY_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
const PRIORITY_COLORS = ['#94a3b8', '#f97316', '#ef4444', '#dc2626'];

export function WorkOrderStatusChart({ stats }: { stats: WorkOrderStats }) {
  const data = useMemo(
    () => [
      { name: 'פתוחות', value: stats.open, color: STATUS_COLORS[0] },
      { name: 'בטיפול', value: stats.inProgress, color: STATUS_COLORS[1] },
      { name: 'הושלמו היום', value: stats.doneToday, color: STATUS_COLORS[2] },
    ].filter((d) => d.value > 0),
    [stats]
  );

  if (!data.length) return null;

  return (
    <div className="w-full">
      <div className="text-xs font-black text-slate-700 mb-3">קריאות לפי סטטוס</div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: 700,
              direction: 'rtl',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', fontWeight: 700, direction: 'rtl' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WorkOrderPriorityChart({ stats }: { stats: WorkOrderStats }) {
  const data = useMemo(
    () => [
      { name: 'רגיל', value: Math.max(0, stats.total - stats.priorityHigh - stats.priorityUrgent - stats.priorityCritical), fill: PRIORITY_COLORS[0] },
      { name: 'גבוה', value: stats.priorityHigh, fill: PRIORITY_COLORS[1] },
      { name: 'דחוף', value: stats.priorityUrgent, fill: PRIORITY_COLORS[2] },
      { name: 'קריטי', value: stats.priorityCritical, fill: PRIORITY_COLORS[3] },
    ].filter((d) => d.value > 0),
    [stats]
  );

  if (!data.length) return null;

  return (
    <div className="w-full">
      <div className="text-xs font-black text-slate-700 mb-3">קריאות לפי עדיפות</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ right: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
            width={50}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: 700,
              direction: 'rtl',
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InventoryPieChart({ inventory }: { inventory: InventorySummary }) {
  const data = useMemo(
    () => [
      { name: 'תקין', value: inventory.ok, color: INVENTORY_COLORS[0] },
      { name: 'נמוך', value: inventory.low, color: INVENTORY_COLORS[1] },
      { name: 'קריטי', value: inventory.critical, color: INVENTORY_COLORS[2] },
    ].filter((d) => d.value > 0),
    [inventory]
  );

  if (!data.length) return null;

  return (
    <div className="w-full">
      <div className="text-xs font-black text-slate-700 mb-3">מלאי לפי מצב</div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: 700,
              direction: 'rtl',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', fontWeight: 700, direction: 'rtl' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
