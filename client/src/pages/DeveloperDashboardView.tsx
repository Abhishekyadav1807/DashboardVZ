import React, { useState, useEffect } from 'react';
import { DashboardService, TaskService } from '../services/api.services';
import { Task } from '../types';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { TaskFilterBar } from '../components/TaskFilterBar';
import { TaskCard } from '../components/TaskCard';
import { useSocket } from '../context/SocketContext';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, Layers } from 'lucide-react';

export const DeveloperDashboardView: React.FC = () => {
  const { latestTaskUpdate } = useSocket();
  const [searchParams] = useSearchParams();

  const [metrics, setMetrics] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDevData = async () => {
    try {
      setLoading(true);
      const data = await DashboardService.getDashboard();
      setMetrics(data.metrics);
    } catch (err) {
      console.error('Failed to load developer dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevData();
  }, []);

  // Filter assigned tasks
  useEffect(() => {
    const filters = {
      status: (searchParams.get('status') as any) || undefined,
      priority: (searchParams.get('priority') as any) || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
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
        return prev;
      });
      loadDevData();
    }
  }, [latestTaskUpdate]);

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Dev Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: '#fff' }}>
          Developer Assigned Workspace
        </h1>
        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          Your sprint deliverables sorted by Priority (Critical → High → Medium → Low) then Due Date.
        </p>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>ASSIGNED TASKS</span>
            <Layers size={18} color="var(--color-brand)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginTop: '0.5rem' }}>
            {metrics?.totalAssigned ?? '...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            In active backlog
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>IN PROGRESS</span>
            <Clock size={18} color="var(--color-brand)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-brand)', marginTop: '0.5rem' }}>
            {metrics?.inProgress ?? '...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            Currently developing
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>IN REVIEW</span>
            <Clock size={18} color="var(--color-in-review)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-in-review)', marginTop: '0.5rem' }}>
            {metrics?.inReview ?? '...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            Awaiting PM signoff
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>OVERDUE</span>
            <AlertTriangle size={18} color="var(--color-danger)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-danger)', marginTop: '0.5rem' }}>
            {metrics?.overdueCount ?? '...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            Past due date
          </div>
        </div>
      </div>

      {/* Main Grid: Developer Tasks & Assigned Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Filterable Tasks */}
        <div>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
            My Assigned Tasks ({tasks.length})
          </h3>
          <TaskFilterBar />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {tasks.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', gridColumn: '1 / -1' }}>
                No tasks currently assigned matching these filters.
              </div>
            ) : (
              tasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  canChangeStatus={true}
                  onStatusChange={(updated) => {
                    setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Developer Scoped Activity Feed */}
        <div style={{ height: '640px', position: 'sticky', top: '70px' }}>
          <LiveActivityFeed title="My Tasks Activity Feed" />
        </div>
      </div>
    </div>
  );
};
