import React, { useState, useEffect } from 'react';
import { ActivityService } from '../services/api.services';
import { useSocket } from '../context/SocketContext';
import { Activity } from '../types';
import { Activity as ActivityIcon, Clock } from 'lucide-react';

function timeAgo(dateString: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSec < 45) return 'just now';
  if (diffSec < 90) return '1 min ago';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export const LiveActivityFeed: React.FC<{ title?: string; projectId?: string }> = ({
  title = 'Live Activity Feed',
  projectId,
}) => {
  const { activities: socketActivities, joinProject, leaveProject } = useSocket();
  const [dbActivities, setDbActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // If scoped to a specific project, join the socket room
  useEffect(() => {
    if (projectId) {
      joinProject(projectId);
      return () => leaveProject(projectId);
    }
  }, [projectId]);

  // Load last 20 events from DB (missed event catchup)
  useEffect(() => {
    let isMounted = true;
    const loadCatchup = async () => {
      try {
        setLoading(true);
        const data = await ActivityService.list(20);
        if (isMounted) {
          setDbActivities(data);
        }
      } catch (err) {
        console.error('Failed to load activity catchup', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadCatchup();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // Merge socket events with DB catchup (deduplicating by ID)
  const allActivities = React.useMemo(() => {
    const map = new Map<string, Activity>();
    // Add real-time first
    socketActivities.forEach((act) => {
      if (!projectId || act.projectId === projectId) {
        map.set(act.id, act);
      }
    });
    // Add DB catchup
    dbActivities.forEach((act) => {
      if (!projectId || act.projectId === projectId) {
        if (!map.has(act.id)) {
          map.set(act.id, act);
        }
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [socketActivities, dbActivities, projectId]);

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          borderBottom: '1px solid var(--color-border-subtle)',
          paddingBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ActivityIcon size={16} color="var(--color-brand)" />
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {title}
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.6875rem', color: '#34c97b' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#34c97b',
              boxShadow: '0 0 6px #34c97b',
            }}
          />
          Live
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading && allActivities.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', padding: '2rem 0' }}>
            Loading activity stream...
          </div>
        ) : allActivities.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', padding: '2rem 0' }}>
            No recent activity recorded.
          </div>
        ) : (
          allActivities.slice(0, 30).map((act) => (
            <div
              key={act.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                fontSize: '0.8125rem',
                padding: '0.5rem 0.6rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--color-brand)',
                  marginTop: '5px',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                  {act.formattedMessage || act.details || `${act.user.name} performed an action`}
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.6875rem',
                    marginTop: '0.25rem',
                  }}
                >
                  <Clock size={11} />
                  <span>{timeAgo(act.createdAt)}</span>
                  {act.project?.name && (
                    <span style={{ color: 'var(--color-brand)', marginLeft: '0.5rem' }}>
                      • {act.project.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
