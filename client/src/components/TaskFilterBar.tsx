import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { TaskStatus, TaskPriority } from '../types';
import { Filter, X } from 'lucide-react';

export const TaskFilterBar: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get('status') || '';
  const currentPriority = searchParams.get('priority') || '';
  const currentStartDate = searchParams.get('startDate') || '';
  const currentEndDate = searchParams.get('endDate') || '';

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const clearAll = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(currentStatus || currentPriority || currentStartDate || currentEndDate);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
        <Filter size={15} />
        <span style={{ fontWeight: 600 }}>Filters:</span>
      </div>

      {/* Status Filter */}
      <select
        value={currentStatus}
        onChange={(e) => updateFilter('status', e.target.value)}
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          fontSize: '0.8125rem',
          padding: '0.35rem 0.6rem',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
        }}
      >
        <option value="">All Statuses</option>
        <option value="TODO">To Do</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="DONE">Done</option>
      </select>

      {/* Priority Filter */}
      <select
        value={currentPriority}
        onChange={(e) => updateFilter('priority', e.target.value)}
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          fontSize: '0.8125rem',
          padding: '0.35rem 0.6rem',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
        }}
      >
        <option value="">All Priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>

      {/* Due Date Range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <input
          type="date"
          value={currentStartDate}
          onChange={(e) => updateFilter('startDate', e.target.value)}
          placeholder="From"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontSize: '0.75rem',
            padding: '0.3rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
          }}
        />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>to</span>
        <input
          type="date"
          value={currentEndDate}
          onChange={(e) => updateFilter('endDate', e.target.value)}
          placeholder="To"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontSize: '0.75rem',
            padding: '0.3rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
          }}
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-danger)',
            fontSize: '0.75rem',
            cursor: 'pointer',
            padding: '0.2rem 0.5rem',
          }}
        >
          <X size={13} /> Reset
        </button>
      )}
    </div>
  );
};
