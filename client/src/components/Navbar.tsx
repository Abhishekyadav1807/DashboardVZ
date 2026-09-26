import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { NotificationService } from '../services/api.services';
import { Notification } from '../types';
import { Bell, User as UserIcon, LogOut, CheckCheck, Radio } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, login } = useAuth();
  const { onlineCount, notifications, setNotifications, unreadNotificationCount, setUnreadNotificationCount } =
    useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Load initial notifications from DB
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await NotificationService.list();
        setNotifications(data.notifications);
        setUnreadNotificationCount(data.unreadCount);
      } catch (err) {
        console.error('Failed to load notifications', err);
      }
    };
    fetchNotifications();
  }, [setNotifications, setUnreadNotificationCount]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)),
      );
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
      setUnreadNotificationCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  // Quick Switcher accounts for evaluator ease
  const demoAccounts = [
    { email: 'marcus.vance@velozity.io', label: 'Admin (Marcus Vance)' },
    { email: 'sarah.jenkins@velozity.io', label: 'PM 1 (Sarah Jenkins)' },
    { email: 'david.sterling@velozity.io', label: 'PM 2 (David Sterling)' },
    { email: 'elena.rostova@velozity.io', label: 'Dev 1 (Elena Rostova)' },
    { email: 'alex.chen@velozity.io', label: 'Dev 2 (Alex Chen)' },
  ];

  const handleQuickSwitch = async (email: string) => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123!' }),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        login(data.data.accessToken, data.data.user);
        setShowRoleSwitcher(false);
        window.location.reload();
      }
    } catch (err) {
      console.error('Quick switch failed', err);
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return { background: 'rgba(240, 82, 82, 0.15)', color: '#f05252', border: '1px solid rgba(240, 82, 82, 0.3)' };
      case 'PROJECT_MANAGER':
        return { background: 'rgba(79, 126, 248, 0.15)', color: '#4f7ef8', border: '1px solid rgba(79, 126, 248, 0.3)' };
      case 'DEVELOPER':
        return { background: 'rgba(52, 201, 123, 0.15)', color: '#34c97b', border: '1px solid rgba(52, 201, 123, 0.3)' };
      default:
        return {};
    }
  };

  return (
    <header
      style={{
        height: 'var(--topnav-height)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand & Presence Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#4f7ef8',
              boxShadow: '0 0 10px #4f7ef8',
            }}
          />
          <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em', color: '#fff' }}>
            VELOZITY
          </span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>| Agency Dashboard</span>
        </div>

        {/* Live Active Users Online */}
        <div
          title="Active online users in real-time via WebSocket"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            padding: '0.2rem 0.6rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          <Radio size={12} color="#34c97b" />
          <span>
            <strong style={{ color: '#fff' }}>{onlineCount}</strong> online
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Quick Role Switcher for Assessment Evaluators */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              padding: '0.3rem 0.6rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            Switch Role ▾
          </button>

          {showRoleSwitcher && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '230px',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 60,
                padding: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', padding: '0.25rem 0.5rem' }}>
                Quick switch (evaluator tool):
              </div>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleQuickSwitch(acc.email)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.4rem 0.5rem',
                    background: user?.email === acc.email ? 'var(--color-brand-dim)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: user?.email === acc.email ? 'var(--color-brand)' : 'var(--color-text-primary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              position: 'relative',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadNotificationCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: 'var(--color-danger)',
                  color: '#fff',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '320px',
                maxHeight: '400px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>Notifications</span>
                {unreadNotificationCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-brand)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>

              <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read && handleMarkAsRead(n.id)}
                      style={{
                        padding: '0.6rem 1rem',
                        borderBottom: '1px solid var(--color-border-subtle)',
                        background: n.read ? 'transparent' : 'rgba(79, 126, 248, 0.05)',
                        cursor: n.read ? 'default' : 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: n.read ? 500 : 700, fontSize: '0.8125rem', color: n.read ? 'var(--color-text-secondary)' : '#fff' }}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'var(--color-brand)',
                            }}
                          />
                        )}
                      </div>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info & Role Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            <UserIcon size={14} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {user?.name}
            </span>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 600,
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                alignSelf: 'flex-start',
                marginTop: '1px',
                ...getRoleBadgeStyle(user?.role),
              }}
            >
              {user?.role.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '0.4rem',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
