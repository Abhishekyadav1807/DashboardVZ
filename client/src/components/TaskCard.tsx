import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import { TaskService } from '../services/api.services';
import { Calendar, AlertCircle, User as UserIcon } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onStatusChange?: (updatedTask: Task) => void;
  canChangeStatus?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onStatusChange,
  canChangeStatus = true,
}) => {
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(task.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate).getTime() < Date.now() &&
    currentStatus !== 'DONE';

  const handleStatusUpdate = async (newStatus: TaskStatus) => {
    if (newStatus === currentStatus || isUpdating) return;
    try {
      setIsUpdating(true);
      const updated = await TaskService.updateStatus(task.id, newStatus);
      setCurrentStatus(newStatus);
      if (onStatusChange) onStatusChange(updated);
    } catch (err) {
      console.error('Failed to update task status', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return { background: 'rgba(240, 82, 82, 0.15)', color: '#f05252' };
      case 'HIGH':
        return { background: 'rgba(240, 117, 50, 0.15)', color: '#f07532' };
      case 'MEDIUM':
        return { background: 'rgba(240, 168, 50, 0.15)', color: '#f0a832' };
      case 'LOW':
        return { background: 'rgba(52, 201, 123, 0.15)', color: '#34c97b' };
      default:
        return {};
    }
  };

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        boxShadow: 'var(--shadow-sm)',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header: Project name & Priority */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-brand)', fontWeight: 600 }}>
          {task.project?.name || 'Project'}
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            ...getPriorityBadge(task.priority),
          }}
        >
          {task.priority}
        </span>
      </div>

      {/* Title */}
      <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
          {task.description}
        </p>
      )}

      {/* Footer: Due date & Assigned Dev */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          marginTop: '0.25rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--color-border-subtle)',
          fontSize: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {/* Due date */}
          {task.dueDate && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)',
                fontWeight: isOverdue ? 700 : 400,
              }}
            >
              {isOverdue ? <AlertCircle size={13} color="var(--color-danger)" /> : <Calendar size={13} />}
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              {isOverdue && (
                <span
                  style={{
                    background: 'rgba(240, 82, 82, 0.2)',
                    color: '#f05252',
                    padding: '0.05rem 0.3rem',
                    borderRadius: '3px',
                    fontSize: '0.625rem',
                  }}
                >
                  OVERDUE
                </span>
              )}
            </div>
          )}

          {/* Assigned Developer */}
          {task.assignedDeveloper && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-secondary)' }}>
              <UserIcon size={12} />
              <span>{task.assignedDeveloper.name}</span>
            </div>
          )}
        </div>

        {/* Status Controller */}
        {canChangeStatus ? (
          <select
            value={currentStatus}
            disabled={isUpdating}
            onChange={(e) => handleStatusUpdate(e.target.value as TaskStatus)}
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color:
                currentStatus === 'DONE'
                  ? 'var(--color-success)'
                  : currentStatus === 'IN_REVIEW'
                  ? 'var(--color-in-review)'
                  : currentStatus === 'IN_PROGRESS'
                  ? 'var(--color-brand)'
                  : 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              cursor: isUpdating ? 'wait' : 'pointer',
            }}
          >
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>
        ) : (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.4rem',
              borderRadius: '4px',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {currentStatus.replace('_', ' ')}
          </span>
        )}
      </div>
    </div>
  );
};
