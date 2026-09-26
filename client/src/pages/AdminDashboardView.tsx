import React, { useState, useEffect } from 'react';
import { DashboardService, ProjectService, TaskService } from '../services/api.services';
import { Project, Task } from '../types';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { TaskFilterBar } from '../components/TaskFilterBar';
import { TaskCard } from '../components/TaskCard';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { useSocket } from '../context/SocketContext';
import { useSearchParams } from 'react-router-dom';
import { FolderGit2, CheckCircle2, Clock, AlertTriangle, Users, Plus } from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const { onlineCount, latestTaskUpdate } = useSocket();
  const [searchParams] = useSearchParams();

  const [metrics, setMetrics] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Load metrics & projects
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashData, projectsData] = await Promise.all([
        DashboardService.getDashboard(),
        ProjectService.list(),
      ]);
      setMetrics(dashData.metrics);
      setProjects(projectsData);
    } catch (err) {
      console.error('Failed to load admin dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Load tasks with filters
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

  // Update task list on live socket updates
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
      // Refresh metrics silently
      DashboardService.getDashboard().then((d) => setMetrics(d.metrics)).catch(() => {});
    }
  }, [latestTaskUpdate]);

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Bar with Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: '#fff' }}>
            Executive Admin Dashboard
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            System-wide project operations, active team presence, and live cross-project activity feed.
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
            <Plus size={15} /> New Project
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
            <Plus size={15} /> New Task
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>TOTAL PROJECTS</span>
            <FolderGit2 size={18} color="var(--color-brand)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginTop: '0.5rem' }}>
            {metrics?.totalProjects ?? '...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            Across all clients
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>TASK STATUSES</span>
            <Clock size={18} color="var(--color-in-review)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-brand)' }}>
              {metrics?.tasksByStatus?.IN_PROGRESS || 0}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>active</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)', marginLeft: '0.5rem' }}>
              {metrics?.tasksByStatus?.DONE || 0}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>done</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            {metrics?.tasksByStatus?.TODO || 0} to do • {metrics?.tasksByStatus?.IN_REVIEW || 0} in review
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>OVERDUE TASKS</span>
            <AlertTriangle size={18} color="var(--color-danger)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-danger)', marginTop: '0.5rem' }}>
            {metrics?.overdueCount ?? '...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            Flagged by scheduler
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>ACTIVE ONLINE</span>
            <Users size={18} color="#34c97b" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#34c97b', marginTop: '0.5rem' }}>
            {onlineCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            Live WebSocket presence
          </div>
        </div>
      </div>

      {/* Main Grid: Projects & Global Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Projects Overview & Filterable Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Projects Table */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
              All Active Client Projects
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {projects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>
                      {p.name}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-brand)' }}>
                      Client: {p.client?.name || 'Enterprise'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      {p._count?.tasks ?? 0} tasks
                    </span>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                      PM: {p.createdBy?.name || 'Staff'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks Section with Filter Bar */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                All Platform Tasks ({tasks.length})
              </h3>
            </div>
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
        </div>

        {/* Right Column: Global Real-Time Activity Feed */}
        <div style={{ height: '720px', position: 'sticky', top: '70px' }}>
          <LiveActivityFeed title="Global Live Activity Feed" />
        </div>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSuccess={(newProj) => {
          setProjects((prev) => [newProj, ...prev]);
        }}
      />
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={(newTask) => {
          setTasks((prev) => [newTask, ...prev]);
        }}
      />
    </div>
  );
};
