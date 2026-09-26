import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { AdminDashboardView } from './AdminDashboardView';
import { PMDashboardView } from './PMDashboardView';
import { DeveloperDashboardView } from './DeveloperDashboardView';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case 'ADMIN':
        return <AdminDashboardView />;
      case 'PROJECT_MANAGER':
        return <PMDashboardView />;
      case 'DEVELOPER':
        return <DeveloperDashboardView />;
      default:
        return (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Unrecognized role. Please sign in again.
          </div>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>{renderDashboard()}</main>
    </div>
  );
};
