import React, { useState, useEffect } from 'react';
import { DashboardService, TaskService } from '../services/api.services';
import { Task } from '../types';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { TaskFilterBar } from '../components/TaskFilterBar';
import { TaskCard } from '../components/TaskCard';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { useSocket } from '../context/SocketContext';
import { useSearchParams } from 'react-router-dom';
import { FolderPlus, Plus, Calendar, BarChart2 } from 'lucide-react';

export const PMDashboardView: React.FC = () => {
  const { latestTaskUpdate } = useSocket();
  const [searchParams] = useSearchParams();

  const [metrics, setMetrics] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const loadPMData = async () => {
    try {
      setLoading(true);
      const data = await DashboardService.getDashboard();
      setMetrics(data.metrics);
    } catch (err) {
      console.error('Failed to load PM metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPMData();
  }, []);

  // Filter tasks
  useEffect(() => {
    const filters = {
      status: (searchParams.get('status') as any) || undefined,
      priority: (searchParams.get('priority') as any) || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      projectId: searchParams.get('projectId') || undefined,
    };
    TaskService.list(filters)
      .then((data) => setTasks(data))
      .catch((err) => console.error('Failed to load tasks', err));
  }, [searchParams]);

  useEffect(() => {
    if (latestTaskUpdate) {
      setTasks((prev) => {
        const index = prev.findIndex((t) => t.id === latestTaskUpdate.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = latestTaskUpdate;
          return updated;
        }
        return [latestTaskUpdate, ...prev];
      });
      loadPMData();
    }
  }, [latestTaskUpdate]);

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* PM Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: '#fff' }}>
            Project Manager Workspace
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Manage client deliverables, monitor sprint tasks, and track team progress in real time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <FolderPlus size={15} /> New Project
          </button>
          <button
            onClick={() => setIsTaskModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              background: 'var(--color-brand)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={15} /> Assign Task
          </button>
        </div>
      </div>

      {/* Projects Summary Cards with Progress Bars */}
      <div>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9375rem', fontWeight: 600, color: '#fff' }}>
          My Projects Summary ({metrics?.projectsSummary?.length || 0})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {metrics?.projectsSummary?.map((p: any) => (
            <div
              key={p.id}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#fff' }}>
                    {p.name}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-brand)' }}>
                    Client: {p.clientName}
                  </span>
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-success)' }}>
                  {p.progressPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'var(--color-surface-2)',
                  borderRadius: '3px',
                  marginTop: '0.85rem',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${p.progressPercent}%`,
                    height: '100%',
                    background: 'var(--color-brand)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                <span>{p.doneTasks} of {p.totalTasks} completed</span>
                <span>{p.totalTasks - p.doneTasks} remaining</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Breakdown & Upcoming Deadlines Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Priority distribution */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff', marginBottom: '0.75rem' }}>
            <BarChart2 size={16} color="var(--color-brand)" />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Tasks by Priority</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
            <div style={{ background: 'var(--color-surface-2)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                {metrics?.tasksByPriority?.CRITICAL || 0}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>CRITICAL</div>
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f07532' }}>
                {metrics?.tasksByPriority?.HIGH || 0}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>HIGH</div>
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f0a832' }}>
                {metrics?.tasksByPriority?.MEDIUM || 0}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>MEDIUM</div>
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-success)' }}>
                {metrics?.tasksByPriority?.LOW || 0}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>LOW</div>
            </div>
          </div>
        </div>

        {/* Upcoming Due Dates This Week */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff', marginBottom: '0.75rem' }}>
            <Calendar size={16} color="var(--color-brand)" />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Upcoming Due Dates This Week</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '110px', overflowY: 'auto' }}>
            {metrics?.upcomingTasks?.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                No active tasks due this week.
              </div>
            ) : (
              metrics?.upcomingTasks?.map((t: any) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.35rem 0.5rem',
                    background: 'var(--color-surface-2)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                  }}
                >
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{t.title}</span>
                  <span style={{ color: 'var(--color-brand)' }}>
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Soon'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: My Team Tasks & Team Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Filterable Tasks */}
        <div>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
            Project Tasks ({tasks.length})
          </h3>
          <TaskFilterBar />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {tasks.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', gridColumn: '1 / -1' }}>
                No tasks matching the selected filters.
              </div>
            ) : (
              tasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onStatusChange={(updated) => {
                    setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: PM Project Activity Feed */}
        <div style={{ height: '640px', position: 'sticky', top: '70px' }}>
          <LiveActivityFeed title="My Projects Activity Feed" />
        </div>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSuccess={() => loadPMData()}
      />
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={(newTask) => setTasks((prev) => [newTask, ...prev])}
      />
    </div>
  );
};
