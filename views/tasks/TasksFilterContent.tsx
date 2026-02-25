import React from 'react';
import { Priority, User } from '../../types';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../../constants';
import { CustomSelect } from '../../components/CustomSelect';

type TasksFilterContentProps = {
  filterPriority: Priority | 'all';
  filterAssignee: string;
  activeFiltersCount: number;
  scopedUsers: User[];
  onFilterPriorityChange: (value: Priority | 'all') => void;
  onFilterAssigneeChange: (value: string) => void;
  onClearFilters: () => void;
};

export const TasksFilterContent: React.FC<TasksFilterContentProps> = ({
  filterPriority,
  filterAssignee,
  activeFiltersCount,
  scopedUsers,
  onFilterPriorityChange,
  onFilterAssigneeChange,
  onClearFilters,
}) => (
  <>
    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
      <span className="text-xs font-bold text-gray-400 uppercase">סינון לפי</span>
      {activeFiltersCount > 0 && (
        <button onClick={onClearFilters} className="text-xs text-red-500 hover:underline whitespace-nowrap">נקה הכל</button>
      )}
    </div>

    <div>
      <label className="text-xs font-bold text-gray-700 block mb-2">דחיפות</label>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <button
          onClick={() => onFilterPriorityChange('all')}
          className={`text-[11px] sm:text-xs px-2.5 sm:px-2 py-1.5 rounded-lg border transition-all whitespace-nowrap shrink-0 ${filterPriority === 'all' ? 'bg-black text-white border-gray-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
        >
          הכל
        </button>
        {(Object.values(Priority) as Priority[]).map(p => (
          <button
            key={p}
            onClick={() => onFilterPriorityChange(p)}
            className={`text-[11px] sm:text-xs px-2.5 sm:px-2 py-1.5 rounded-lg border transition-all whitespace-nowrap shrink-0 ${filterPriority === p ? PRIORITY_COLORS[p] + ' ring-1 ring-offset-1 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
          >
            {PRIORITY_LABELS[p]}
          </button>
        ))}
      </div>
    </div>

    <div>
      <label className="text-xs font-bold text-gray-700 block mb-2">אחראי</label>
      <CustomSelect
        value={filterAssignee}
        onChange={onFilterAssigneeChange}
        options={[
          { value: 'all', label: 'כל העובדים' },
          ...scopedUsers.map((u: User) => ({ value: u.id, label: u.name }))
        ]}
        className="text-sm w-full"
      />
    </div>
  </>
);
